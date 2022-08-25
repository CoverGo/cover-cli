import gql from "graphql-tag"
import { print } from "graphql"
import axios from "axios"

class QueryError extends Error {}

export function useCreateTenant(token, endpoint) {
	async function executeQuery(fn, startMessage, endMessage) {
		console.log(startMessage)
		const result = await fn()
		console.log(endMessage)
		return result
	}

	async function createTenant(tenantId, email, username, password, redirectUris, fsConfig) {
		const query = gql`
			mutation createTenant(
				$tenantId: String!,
				$email: String!,
				$username: String!,
				$password: String!,
				$redirectUris: [String]!
				$fsConfig: fileSystemConfigInput!
			) {
				initializeTenant(
					tenantId: $tenantId
					adminSettings: {
						email: $email
						username: $username
						password: $password
					}
					logins: null
					apps: [{
						appId: "covergo_crm",
						appName: "Admin Portal",
						# First URL is to invite user, second is to reset password
						# Replace with the URL where the app runs
						redirectUris: $redirectUris
					}]
					fileSystemInput: {
						config: $fsConfig
					}
				) {
					status
					errors
				}
			}
		`

		const result = await axios.post(
			endpoint,
			{
				variables: {
					tenantId,
					email,
					username,
					password,
					redirectUris,
					fsConfig,
				},
				query: print(query)
			},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				}
			}
		)

		if (result.data.data.initializeTenant.errors?.[0]) {
			throw new QueryError(result.data.data.initializeTenant.errors?.[0])
		}
	}

	async function getToken(tenantId, username, password) {
		const query = gql`
			query getToken($tenantId: String!, $username: String!, $password: String!) {
				token: token_2(
					tenantId: $tenantId
					clientId: "covergo_crm"
					username: $username
					password: $password
				) {
					accessToken
					error
				}
			}
		`

		const result = await axios.post(
			endpoint,
			{
				variables: {
					tenantId,
					username,
					password,
				},
				query: print(query)
			}
		)

		const tenantToken = result.data?.data?.token?.accessToken
		if (!tenantToken) {
			throw new QueryError('Cannot fetch token for newly created tenant. This is probably bug.')
		}

		return tenantToken
	}

	async function createMailTemplate(tenantToken) {
		const query = gql`
			mutation createEmailMjmlTemplate{
				createEmailMjmlTemplate(
					input: {
						name: "Invite User",
						description: "",
						mjml: "<mjml  padding=\\"0\\">\\r\\n    <mj-body>\\r\\n        <mj-section text-align=\\"left\\" >\\r\\n            <mj-column padding=\\"0\\"  width=\\"100%\\">\\r\\n                <mj-text  padding=\\"0\\">Dear {{data.userName}}<br \\/> <br \\/> <br \\/> Please set your password by <a target=\\"_blank\\" rel=\\"noopener noreferrer\\" href=\\"{{data.callbackUrl}}\\">clicking here.<\\/a><\\/mj-text>\\r\\n            <\\/mj-column>\\r\\n        <\\/mj-section>\\r\\n    <\\/mj-body>\\r\\n<\\/mjml>",
						subject: "Create Password"
					}
				) {
					errors
					status
				}
			}
		`

		const result = await axios.post(
			endpoint,
			{
				query: print(query)
			},
			{
				headers: {
					Authorization: `Bearer ${tenantToken}`,
				}
			}
		)

		if (result.data.data.createEmailMjmlTemplate.errors) {
			throw new QueryError(result.data.data.createEmailMjmlTemplate.errors)
		}
	}

	async function listTemplates(tenantToken) {
		const query = gql`
			query templates {
				templates {
					list {
						...on emailMjmlTemplate{
							id
						}
					}
				}
			}
		`

		const result = await axios.post(
			endpoint,
			{
				query: print(query)
			},
			{
				headers: {
					Authorization: `Bearer ${tenantToken}`,
				}
			}
		)

		const templateId = result.data.data?.templates?.list[0]?.id
		if (templateId) {
			return templateId
		}

		throw new QueryError('Unable to find template')
	}

	async function updateTemplate(tenantToken, templateId) {
		const templateUpdate = gql`
			mutation updateEmailMjmlTemplate($templateId: String!) {
				updateEmailMjmlTemplate(
					templateId: "<id from query above>"
					input: {
						logicalId: "newPasswordTemplate"
					}
				) {
					status
				}
			}
		`

		const result = await axios.post(
			endpoint,
			{
				variables: {
					templateId
				},
				query: print(templateUpdate)
			},
			{
				headers: {
					Authorization: `Bearer ${tenantToken}`,
				}
			}
		)

		if (result.data.data?.updateEmailMjmlTemplate?.errors) {
			throw new QueryError(`Error returned from update template.`)
		}
	}

	async function createSchemas(tenantToken) {
		const query = gql`
			mutation dataSchemaIndividual {
				individualFields: createDataSchema(
					input: {
						type: "individual-dynamic-fields"
						name: "individual-dynamic-fields"
						description: "individual-dynamic-fields"
						schema: "{\\"type\\":\\"object\\",\\"properties\\":{\\"englishFirstName\\":{\\"type\\":\\"string\\",\\"label\\":\\"First Name\\"},\\"englishLastName\\":{\\"type\\":\\"string\\",\\"label\\":\\"Last Name\\"},\\"email\\":{\\"type\\":\\"string\\",\\"label\\":\\"Email\\"},\\"address\\":{\\"type\\":\\"object\\",\\"label\\":\\"Address\\",\\"properties\\":{\\"address1\\":{\\"type\\":\\"string\\",\\"label\\":\\"Address 1\\"},\\"address2\\":{\\"type\\":\\"string\\",\\"label\\":\\"Address 2\\"},\\"city\\":{\\"type\\":\\"string\\",\\"title\\":\\"City\\"},\\"province\\":{\\"type\\":\\"string\\",\\"label\\":\\"Province\\"},\\"postalCode\\":{\\"type\\":\\"string\\",\\"label\\":\\"Postal Code\\"},\\"country\\":{\\"type\\":\\"string\\",\\"label\\":\\"Country\\"}}}}}"
					}
				) {
					createdStatus {
						id
					}
				}

				uiIndividualFields: createUiSchema(
					input: {
						standard: { type: JSON_SCHEMA }
						name: "uischema-individual-dynamic-fields"
						schema: "{\\"type\\":\\"VerticalLayout\\",\\"elements\\":[{\\"type\\":\\"Control\\",\\"scope\\":\\"#/properties/englishFirstName\\",\\"mode\\":\\"typing\\"},{\\"type\\":\\"Control\\",\\"scope\\":\\"#/properties/englishLastName\\",\\"mode\\":\\"typing\\"},{\\"type\\":\\"Control\\",\\"scope\\":\\"#/properties/email\\",\\"mode\\":\\"typing\\"},{\\"type\\":\\"VerticalLayout\\",\\"elements\\":[{\\"type\\":\\"Control\\",\\"scope\\":\\"#/properties/address1\\",\\"mode\\":\\"typing\\"},{\\"type\\":\\"Control\\",\\"scope\\":\\"#/properties/address2\\",\\"mode\\":\\"typing\\"},{\\"type\\":\\"Control\\",\\"scope\\":\\"#/properties/city\\",\\"mode\\":\\"typing\\"},{\\"type\\":\\"Control\\",\\"scope\\":\\"#/properties/province\\",\\"mode\\":\\"typing\\"},{\\"type\\":\\"Control\\",\\"scope\\":\\"#/properties/postalCode\\",\\"mode\\":\\"typing\\"},{\\"type\\":\\"Control\\",\\"scope\\":\\"#/properties/country\\",\\"mode\\":\\"typing\\"}],\\"scope\\":\\"#/properties/address\\"}]}"
					}
				) {
					createdStatus {
						id
					}
				}

				companyDynamicFields: createDataSchema(
					input: {
						type: "company-dynamic-fields"
						name: "company-dynamic-fields"
						description: "company-dynamic-fields"
						schema: "{\\n  \\"type\\": \\"object\\",\\n  \\"properties\\": {\\n    \\"companyName\\": {\\n      \\"type\\": \\"string\\",\\n      \\"label\\": \\"Name\\"\\n    },\\n    \\"registrationNumber\\": {\\n      \\"type\\": \\"string\\",\\n      \\"label\\": \\"Registration Number\\"\\n    },\\n    \\"natureOfBusiness\\": {\\n      \\"type\\": \\"string\\",\\n      \\"label\\": \\"Nature of Business\\"\\n    },\\n    \\"email\\": {\\n      \\"type\\": \\"string\\",\\n      \\"label\\": \\"Email\\"\\n    },\\n    \\"address\\": {\\n      \\"type\\": \\"object\\",\\n      \\"label\\": \\"Address\\",\\n      \\"properties\\": {\\n        \\"address1\\": {\\n          \\"type\\": \\"string\\",\\n          \\"label\\": \\"Address 1\\"\\n        },\\n        \\"address2\\": {\\n          \\"type\\": \\"string\\",\\n          \\"label\\": \\"Address 2\\"\\n        },\\n        \\"city\\": {\\n          \\"type\\": \\"string\\",\\n          \\"label\\": \\"City\\"\\n        },\\n        \\"province\\": {\\n          \\"type\\": \\"string\\",\\n          \\"label\\": \\"Province\\"\\n        },\\n        \\"postalCode\\": {\\n          \\"type\\": \\"string\\",\\n          \\"label\\": \\"Postal Code\\"\\n        },\\n        \\"country\\": {\\n          \\"type\\": \\"string\\",\\n          \\"label\\": \\"Country\\"\\n        }\\n      }\\n    }\\n  }\\n}"
					}
				) {
					createdStatus {
						id
					}
				}

				uiCompanyDynamicFields: createUiSchema(
					input: {
						standard: { type: JSON_SCHEMA }
						name: "uischema-company-dynamic-fields"
						schema: "{\\n  \\"type\\": \\"VerticalLayout\\",\\n  \\"elements\\": [\\n    {\\n      \\"type\\": \\"Control\\",\\n      \\"scope\\": \\"#/properties/companyName\\"\\n    },\\n    {\\n      \\"type\\": \\"Control\\",\\n      \\"scope\\": \\"#/properties/registrationNumber\\"\\n    },\\n    {\\n      \\"type\\": \\"Control\\",\\n      \\"scope\\": \\"#/properties/natureOfBusiness\\"\\n    },\\n    {\\n      \\"type\\": \\"Control\\",\\n      \\"scope\\": \\"#/properties/email\\"\\n    },\\n    {\\n      \\"type\\": \\"VerticalLayout\\",\\n      \\"scope\\": \\"#/properties/address\\",\\n      \\"elements\\": [\\n        {\\n          \\"type\\": \\"Control\\",\\n          \\"scope\\": \\"#/properties/address1\\"\\n        },\\n        {\\n          \\"type\\": \\"Control\\",\\n          \\"scope\\": \\"#/properties/address2\\"\\n        },\\n        {\\n          \\"type\\": \\"Control\\",\\n          \\"scope\\": \\"#/properties/city\\"\\n        },\\n        {\\n          \\"type\\": \\"Control\\",\\n          \\"scope\\": \\"#/properties/province\\"\\n        },\\n        {\\n          \\"type\\": \\"Control\\",\\n          \\"scope\\": \\"#/properties/postalCode\\"\\n        },\\n        {\\n          \\"type\\": \\"Control\\",\\n          \\"scope\\": \\"#/properties/country\\"\\n        }\\n      ]\\n    }\\n  ]\\n}"
					}
				) {
					createdStatus {
						id
					}
				}
			}
		`

		const result = await axios.post(
			endpoint,
			{
				query: print(query)
			},
			{
				headers: {
					Authorization: `Bearer ${tenantToken}`,
				}
			}
		)

		const resultValues = {}
		for (const [key, value] of Object.entries(result.data.data)) {
			if (value?.createdStatus?.id) {
				resultValues[key] = value?.createdStatus?.id
			}
		}

		return resultValues
	}

	async function updateTenantSchmeas(tenantToken, individualDataSchema, individualUiDataSchema, companyDataSchema, companyUiDataSchema) {
		const query = gql`
			mutation test(
				$individualDataSchema: String!,
				$individualUiDataSchema: String!,
				$companyDataSchema: String!,
				$companyUiDataSchema: String!
			) {
				individual: addUiSchemaToDataSchema(
					input: {
						dataSchemaId: $individualDataSchema
						uiSchemaId: $individualUiDataSchema
					}
				) {
					status
					errors
				}

				company: addUiSchemaToDataSchema(
					input: {
						dataSchemaId: $companyDataSchema
						uiSchemaId: $companyUiDataSchema
					}
				) {
					status
					errors
				}
			}
		`

		const result = await axios.post(
			endpoint,
			{
				variables: {
					individualDataSchema,
					individualUiDataSchema,
					companyDataSchema,
					companyUiDataSchema
				},
				query: print(query)
			},
			{
				headers: {
					Authorization: `Bearer ${tenantToken}`,
				}
			}
		)

		if (result.data.data.individual.errors || result.data.data.company.errors) {
			throw new QueryError(`Failed to update tenant schemas.`)
		}
	}

	async function createPermissionsGroup(tenantToken) {
		const query = gql`
			mutation createPermissionGroup{
				createPermissionGroup(createPermissionGroupInput: {name:"Admin", description:"Admin role with access to everything"}){
					status
					errors
				}
			}
		`
		const result = await axios.post(
			endpoint,
			{
				query: print(query)
			},
			{
				headers: {
					Authorization: `Bearer ${tenantToken}`,
				}
			}
		)

		if (result.data.data.createPermissionGroup.errors) {
			throw new QueryError(`Failed to create permission group.`)
		}

		const queryGroups = gql`
			query permissionGroups {
				permissionGroups {
					id
					name
				}
			}
		`

		const queryResult = await axios.post(
			endpoint,
			{
				query: print(queryGroups)
			},
			{
				headers: {
					Authorization: `Bearer ${tenantToken}`,
				}
			}
		)

		const groupId = queryResult.data.data.permissionGroups?.[0]?.id
		if (groupId) {
			return groupId
		}

		throw new Error(`Failed to fetch permission group.`)
	}

	async function setAdminPermissions(tenantToken, groupId) {
		const query = gql`
			mutation addPermissions($groupId: String!) {
				role: addPermissionToPermissionGroup(id: $groupId permissionId: "role" targetId: "admin") { status errors }
				resendConfirmationEmail: addPermissionToPermissionGroup(id: $groupId permissionId: "resendConfirmationEmail" targetId: "all") { status errors }
				readLogins: addPermissionToPermissionGroup(id: $groupId permissionId: "readLogins" targetId: "all") { status errors }
				writeLogins: addPermissionToPermissionGroup(id: $groupId permissionId: "writeLogins" targetId: "all") { status errors }
				writeTargettedPermissions: addPermissionToPermissionGroup(id: $groupId permissionId: "writeTargettedPermissions" targetId: "all") { status errors }
				readTargettedPermissions: addPermissionToPermissionGroup(id: $groupId permissionId: "readTargettedPermissions" targetId: "all") { status errors }
				writePermissionGroups: addPermissionToPermissionGroup(id: $groupId permissionId: "writePermissionGroups" targetId: "all") { status errors }
				readPermissionGroups: addPermissionToPermissionGroup(id: $groupId permissionId: "readPermissionGroups" targetId: "all") { status errors }
				readPermissions: addPermissionToPermissionGroup(id: $groupId permissionId: "readPermissions" targetId: "all") { status errors }
				readCompanies: addPermissionToPermissionGroup(id: $groupId permissionId: "readCompanies" targetId: "all") { status errors }
				readIndividuals: addPermissionToPermissionGroup(id: $groupId permissionId: "readIndividuals" targetId: "all") { status errors }
				readInternals: addPermissionToPermissionGroup(id: $groupId permissionId: "readInternals" targetId: "all") { status errors }
				readObjects: addPermissionToPermissionGroup(id: $groupId permissionId: "readObjects" targetId: "all") { status errors }
				readOrganizations: addPermissionToPermissionGroup(id: $groupId permissionId: "readOrganizations" targetId: "all") { status errors }
				writeCompanies: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCompanies" targetId: "all") { status errors }
				writeIndividuals: addPermissionToPermissionGroup(id: $groupId permissionId: "writeIndividuals" targetId: "all") { status errors }
				writeInternals: addPermissionToPermissionGroup(id: $groupId permissionId: "writeInternals" targetId: "all") { status errors }
				writeObjects: addPermissionToPermissionGroup(id: $groupId permissionId: "writeObjects" targetId: "all") { status errors }
				writeOrganizations: addPermissionToPermissionGroup(id: $groupId permissionId: "writeOrganizations" targetId: "all") { status errors }
				readIndividualAddresses: addPermissionToPermissionGroup(id: $groupId permissionId: "readIndividualAddresses" targetId: "all") { status errors }
				readIndividualIdentities: addPermissionToPermissionGroup(id: $groupId permissionId: "readIndividualIdentities" targetId: "all") { status errors }
				readIndividualContacts: addPermissionToPermissionGroup(id: $groupId permissionId: "readIndividualContacts" targetId: "all") { status errors }
				readIndividualFacts: addPermissionToPermissionGroup(id: $groupId permissionId: "readIndividualFacts" targetId: "all") { status errors }
				readIndividualNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "readIndividualNotes" targetId: "all") { status errors }
				readIndividualAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "readIndividualAttachments" targetId: "all") { status errors }
				writeIndividualAddresses: addPermissionToPermissionGroup(id: $groupId permissionId: "writeIndividualAddresses" targetId: "all") { status errors }
				writeIndividualIdentities: addPermissionToPermissionGroup(id: $groupId permissionId: "writeIndividualIdentities" targetId: "all") { status errors }
				writeIndividualContacts: addPermissionToPermissionGroup(id: $groupId permissionId: "writeIndividualContacts" targetId: "all") { status errors }
				writeIndividualFacts: addPermissionToPermissionGroup(id: $groupId permissionId: "writeIndividualFacts" targetId: "all") { status errors }
				writeIndividualNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "writeIndividualNotes" targetId: "all") { status errors }
				writeIndividualAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "writeIndividualAttachments" targetId: "all") { status errors }
				readCompanyAddresses: addPermissionToPermissionGroup(id: $groupId permissionId: "readCompanyAddresses" targetId: "all") { status errors }
				readCompanyIdentities: addPermissionToPermissionGroup(id: $groupId permissionId: "readCompanyIdentities" targetId: "all") { status errors }
				readCompanyContacts: addPermissionToPermissionGroup(id: $groupId permissionId: "readCompanyContacts" targetId: "all") { status errors }
				readCompanyFacts: addPermissionToPermissionGroup(id: $groupId permissionId: "readCompanyFacts" targetId: "all") { status errors }
				readCompanyNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "readCompanyNotes" targetId: "all") { status errors }
				readCompanyAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "readCompanyAttachments" targetId: "all") { status errors }
				writeCompanyAddresses: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCompanyAddresses" targetId: "all") { status errors }
				writeCompanyIdentities: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCompanyIdentities" targetId: "all") { status errors }
				writeCompanyContacts: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCompanyContacts" targetId: "all") { status errors }
				writeCompanyFacts: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCompanyFacts" targetId: "all") { status errors }
				writeCompanyNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCompanyNotes" targetId: "all") { status errors }
				writeCompanyAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCompanyAttachments" targetId: "all") { status errors }
				readInternalAddresses: addPermissionToPermissionGroup(id: $groupId permissionId: "readInternalAddresses" targetId: "all") { status errors }
				readInternalIdentities: addPermissionToPermissionGroup(id: $groupId permissionId: "readInternalIdentities" targetId: "all") { status errors }
				readInternalContacts: addPermissionToPermissionGroup(id: $groupId permissionId: "readInternalContacts" targetId: "all") { status errors }
				readInternalFacts: addPermissionToPermissionGroup(id: $groupId permissionId: "readInternalFacts" targetId: "all") { status errors }
				readInternalNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "readInternalNotes" targetId: "all") { status errors }
				readInternalAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "readInternalAttachments" targetId: "all") { status errors }
				writeInternalAddresses: addPermissionToPermissionGroup(id: $groupId permissionId: "writeInternalAddresses" targetId: "all") { status errors }
				writeInternalIdentities: addPermissionToPermissionGroup(id: $groupId permissionId: "writeInternalIdentities" targetId: "all") { status errors }
				writeInternalContacts: addPermissionToPermissionGroup(id: $groupId permissionId: "writeInternalContacts" targetId: "all") { status errors }
				writeInternalFacts: addPermissionToPermissionGroup(id: $groupId permissionId: "writeInternalFacts" targetId: "all") { status errors }
				writeInternalNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "writeInternalNotes" targetId: "all") { status errors }
				writeInternalAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "writeInternalAttachments" targetId: "all") { status errors }
				readObjectAddresses: addPermissionToPermissionGroup(id: $groupId permissionId: "readObjectAddresses" targetId: "all") { status errors }
				readObjectIdentities: addPermissionToPermissionGroup(id: $groupId permissionId: "readObjectIdentities" targetId: "all") { status errors }
				readObjectContacts: addPermissionToPermissionGroup(id: $groupId permissionId: "readObjectContacts" targetId: "all") { status errors }
				readObjectFacts: addPermissionToPermissionGroup(id: $groupId permissionId: "readObjectFacts" targetId: "all") { status errors }
				readObjectNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "readObjectNotes" targetId: "all") { status errors }
				readObjectAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "readObjectAttachments" targetId: "all") { status errors }
				writeObjectAddresses: addPermissionToPermissionGroup(id: $groupId permissionId: "writeObjectAddresses" targetId: "all") { status errors }
				writeObjectIdentities: addPermissionToPermissionGroup(id: $groupId permissionId: "writeObjectIdentities" targetId: "all") { status errors }
				writeObjectContacts: addPermissionToPermissionGroup(id: $groupId permissionId: "writeObjectContacts" targetId: "all") { status errors }
				writeObjectFacts: addPermissionToPermissionGroup(id: $groupId permissionId: "writeObjectFacts" targetId: "all") { status errors }
				writeObjectNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "writeObjectNotes" targetId: "all") { status errors }
				writeObjectAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "writeObjectAttachments" targetId: "all") { status errors }
				readOrganizationAddresses: addPermissionToPermissionGroup(id: $groupId permissionId: "readOrganizationAddresses" targetId: "all") { status errors }
				readOrganizationIdentities: addPermissionToPermissionGroup(id: $groupId permissionId: "readOrganizationIdentities" targetId: "all") { status errors }
				readOrganizationContacts: addPermissionToPermissionGroup(id: $groupId permissionId: "readOrganizationContacts" targetId: "all") { status errors }
				readOrganizationFacts: addPermissionToPermissionGroup(id: $groupId permissionId: "readOrganizationFacts" targetId: "all") { status errors }
				readOrganizationNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "readOrganizationNotes" targetId: "all") { status errors }
				readOrganizationAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "readOrganizationAttachments" targetId: "all") { status errors }
				writeOrganizationAddresses: addPermissionToPermissionGroup(id: $groupId permissionId: "writeOrganizationAddresses" targetId: "all") { status errors }
				writeOrganizationIdentities: addPermissionToPermissionGroup(id: $groupId permissionId: "writeOrganizationIdentities" targetId: "all") { status errors }
				writeOrganizationContacts: addPermissionToPermissionGroup(id: $groupId permissionId: "writeOrganizationContacts" targetId: "all") { status errors }
				writeOrganizationFacts: addPermissionToPermissionGroup(id: $groupId permissionId: "writeOrganizationFacts" targetId: "all") { status errors }
				writeOrganizationNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "writeOrganizationNotes" targetId: "all") { status errors }
				writeOrganizationAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "writeOrganizationAttachments" targetId: "all") { status errors }
				readPolicies: addPermissionToPermissionGroup(id: $groupId permissionId: "readPolicies" targetId: "all") { status errors }
				writePolicies: addPermissionToPermissionGroup(id: $groupId permissionId: "writePolicies" targetId: "all") { status errors }
				cancelPolicies: addPermissionToPermissionGroup(id: $groupId permissionId: "cancelPolicies" targetId: "all") { status errors }
				readQuotes: addPermissionToPermissionGroup(id: $groupId permissionId: "readQuotes" targetId: "all") { status errors }
				writeQuotes: addPermissionToPermissionGroup(id: $groupId permissionId: "writeQuotes" targetId: "all") { status errors }
				readPolicyNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "readPolicyNotes" targetId: "all") { status errors }
				writePolicyNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "writePolicyNotes" targetId: "all") { status errors }
				writePolicyAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "writePolicyAttachments" targetId: "all") { status errors }
				readPolicyAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "readPolicyAttachments" targetId: "all") { status errors }
				readProducts: addPermissionToPermissionGroup(id: $groupId permissionId: "readProducts" targetId: "all") { status errors }
				writeProducts: addPermissionToPermissionGroup(id: $groupId permissionId: "writeProducts" targetId: "all") { status errors }
				writeLinks: addPermissionToPermissionGroup(id: $groupId permissionId: "writeLinks" targetId: "all") { status errors }
				issuePolicies: addPermissionToPermissionGroup(id: $groupId permissionId: "issuePolicies" targetId: "all") { status errors }
				sendNotifications: addPermissionToPermissionGroup(id: $groupId permissionId: "sendNotifications" targetId: "all") { status errors }
				writeCommissionRules: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCommissionRules" targetId: "all") { status errors }
				readCommissionRules: addPermissionToPermissionGroup(id: $groupId permissionId: "readCommissionRules" targetId: "all") { status errors }
				readInsurers: addPermissionToPermissionGroup(id: $groupId permissionId: "readInsurers" targetId: "all") { status errors }
				writeInsurers: addPermissionToPermissionGroup(id: $groupId permissionId: "writeInsurers" targetId: "all") { status errors }
				readProductTypes: addPermissionToPermissionGroup(id: $groupId permissionId: "readProductTypes" targetId: "all") { status errors }
				writeProductTypes: addPermissionToPermissionGroup(id: $groupId permissionId: "writeProductTypes" targetId: "all") { status errors }
				readTransactions: addPermissionToPermissionGroup(id: $groupId permissionId: "readTransactions" targetId: "all") { status errors }
				writeTransactions: addPermissionToPermissionGroup(id: $groupId permissionId: "writeTransactions" targetId: "all") { status errors }
				readOffers: addPermissionToPermissionGroup(id: $groupId permissionId: "readOffers" targetId: "all") { status errors }
				writeOffers: addPermissionToPermissionGroup(id: $groupId permissionId: "writeOffers" targetId: "all") { status errors }
				overrideOffers: addPermissionToPermissionGroup(id: $groupId permissionId: "overrideOffers" targetId: "all") { status errors }
				clientId: addPermissionToPermissionGroup(id: $groupId permissionId: "clientId" targetId: "all") { status errors }
				readClaims: addPermissionToPermissionGroup(id: $groupId permissionId: "readClaims" targetId: "all") { status errors }
				writeClaims: addPermissionToPermissionGroup(id: $groupId permissionId: "writeClaims" targetId: "all") { status errors }
				readFiles: addPermissionToPermissionGroup(id: $groupId permissionId: "readFiles" targetId: "all") { status errors }
				writeFiles: addPermissionToPermissionGroup(id: $groupId permissionId: "writeFiles" targetId: "all") { status errors }
				readFileSystemConfigs: addPermissionToPermissionGroup(id: $groupId permissionId: "readFileSystemConfigs" targetId: "all") { status errors }
				writeFileSystemConfigs: addPermissionToPermissionGroup(id: $groupId permissionId: "writeFileSystemConfigs" targetId: "all") { status errors }
				readCms: addPermissionToPermissionGroup(id: $groupId permissionId: "readCms" targetId: "all") { status errors }
				writeCms: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCms" targetId: "all") { status errors }
				readTemplates: addPermissionToPermissionGroup(id: $groupId permissionId: "readTemplates" targetId: "all") { status errors }
				writeTemplates: addPermissionToPermissionGroup(id: $groupId permissionId: "writeTemplates" targetId: "all") { status errors }
				readClaimNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "readClaimNotes" targetId: "all") { status errors }
				writeClaimNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "writeClaimNotes" targetId: "all") { status errors }
				writeClaimWhenStatusApproved: addPermissionToPermissionGroup(id: $groupId permissionId: "writeClaimWhenStatusApproved" targetId: "all") { status errors }
				approveClaim: addPermissionToPermissionGroup(id: $groupId permissionId: "approveClaim" targetId: "all") { status errors }
				readCases: addPermissionToPermissionGroup(id: $groupId permissionId: "readCases" targetId: "all") { status errors }
				writeCases: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCases" targetId: "all") { status errors }
				readProposals: addPermissionToPermissionGroup(id: $groupId permissionId: "readProposals" targetId: "all") { status errors }
				writeProposals: addPermissionToPermissionGroup(id: $groupId permissionId: "writeProposals" targetId: "all") { status errors }
				readBinders: addPermissionToPermissionGroup(id: $groupId permissionId: "readBinders" targetId: "all") { status errors }
				writeBinders: addPermissionToPermissionGroup(id: $groupId permissionId: "writeBinders" targetId: "all") { status errors }
				readEndorsements: addPermissionToPermissionGroup(id: $groupId permissionId: "readEndorsements" targetId: "all") { status errors }
				writeEndorsements: addPermissionToPermissionGroup(id: $groupId permissionId: "writeEndorsements" targetId: "all") { status errors }
				updateIssuedPolicies: addPermissionToPermissionGroup(id: $groupId permissionId: "updateIssuedPolicies" targetId: "all") { status errors }
				issueProposals: addPermissionToPermissionGroup(id: $groupId permissionId: "issueProposals" targetId: "all") { status errors }
				readApps: addPermissionToPermissionGroup(id: $groupId permissionId: "readApps" targetId: "all") { status errors }
				writeApps: addPermissionToPermissionGroup(id: $groupId permissionId: "writeApps" targetId: "all") { status errors }
				inviteEntityToLogin: addPermissionToPermissionGroup(id: $groupId permissionId: "inviteEntityToLogin" targetId: "all") { status errors }
				writeCmsConfigs: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCmsConfigs" targetId: "all") { status errors }
				readCmsConfigs: addPermissionToPermissionGroup(id: $groupId permissionId: "readCmsConfigs" targetId: "all") { status errors }
				readPaymentMethods: addPermissionToPermissionGroup(id: $groupId permissionId: "readPaymentMethods" targetId: "all") { status errors }
				writePaymentMethods: addPermissionToPermissionGroup(id: $groupId permissionId: "writePaymentMethods" targetId: "all") { status errors }
				readPlans: addPermissionToPermissionGroup(id: $groupId permissionId: "readPlans" targetId: "all") { status errors }
				writePlans: addPermissionToPermissionGroup(id: $groupId permissionId: "writePlans" targetId: "all") { status errors }
				readSubscriptions: addPermissionToPermissionGroup(id: $groupId permissionId: "readSubscriptions" targetId: "all") { status errors }
				writeSubscriptions: addPermissionToPermissionGroup(id: $groupId permissionId: "writeSubscriptions" targetId: "all") { status errors }
				readCourses: addPermissionToPermissionGroup(id: $groupId permissionId: "readCourses" targetId: "all") { status errors }
				writeCourses: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCourses" targetId: "all") { status errors }
				readCourseProgressions: addPermissionToPermissionGroup(id: $groupId permissionId: "readCourseProgressions" targetId: "all") { status errors }
				writeCourseProgressions: addPermissionToPermissionGroup(id: $groupId permissionId: "writeCourseProgressions" targetId: "all") { status errors }
				readCorrectAnswers: addPermissionToPermissionGroup(id: $groupId permissionId: "readCorrectAnswers" targetId: "all") { status errors }
				readProductConfigs: addPermissionToPermissionGroup(id: $groupId permissionId: "readProductConfigs" targetId: "all") { status errors }
				writeProductConfigs: addPermissionToPermissionGroup(id: $groupId permissionId: "writeProductConfigs" targetId: "all") { status errors }
				transferPermissions: addPermissionToPermissionGroup(id: $groupId permissionId: "transferPermissions" targetId: "all") { status errors }
				readAchievements: addPermissionToPermissionGroup(id: $groupId permissionId: "readAchievements" targetId: "all") { status errors }
				writeAchievements: addPermissionToPermissionGroup(id: $groupId permissionId: "writeAchievements" targetId: "all") { status errors }
				readAchievementTypes: addPermissionToPermissionGroup(id: $groupId permissionId: "readAchievementTypes" targetId: "all") { status errors }
				writeAchievementTypes: addPermissionToPermissionGroup(id: $groupId permissionId: "writeAchievementTypes" targetId: "all") { status errors }
				assignPermissionGroup: addPermissionToPermissionGroup(id: $groupId permissionId: "assignPermissionGroup" targetId: "all") { status errors }
				unassignPermissionGroup: addPermissionToPermissionGroup(id: $groupId permissionId: "unassignPermissionGroup" targetId: "all") { status errors }
				batchIntegrate: addPermissionToPermissionGroup(id: $groupId permissionId: "batchIntegrate" targetId: "all") { status errors }
				writeL10ns: addPermissionToPermissionGroup(id: $groupId permissionId: "writeL10ns" targetId: "all") { status errors }
				readNotificationSubscriptions: addPermissionToPermissionGroup(id: $groupId permissionId: "readNotificationSubscriptions" targetId: "all") { status errors }
				writeNotificationSubscriptions: addPermissionToPermissionGroup(id: $groupId permissionId: "writeNotificationSubscriptions" targetId: "all") { status errors }
				writeFileExtensions: addPermissionToPermissionGroup(id: $groupId permissionId: "writeFileExtensions" targetId: "all") { status errors }
				readNotifications: addPermissionToPermissionGroup(id: $groupId permissionId: "readNotifications" targetId: "all") { status errors }
				writeReviews: addPermissionToPermissionGroup(id: $groupId permissionId: "writeReviews" targetId: "all") { status errors }
				updateLoginLockout: addPermissionToPermissionGroup(id: $groupId permissionId: "updateLoginLockout" targetId: "all") { status errors }
				readNotificationConfigs: addPermissionToPermissionGroup(id: $groupId permissionId: "readNotificationConfigs" targetId: "all") { status errors }
				writeNotificationConfigs: addPermissionToPermissionGroup(id: $groupId permissionId: "writeNotificationConfigs" targetId: "all") { status errors }
				readGOPs: addPermissionToPermissionGroup(id: $groupId permissionId: "readGOPs" targetId: "all") { status errors }
				writeGOPs: addPermissionToPermissionGroup(id: $groupId permissionId: "writeGOPs" targetId: "all") { status errors }
				readGOPNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "readGOPNotes" targetId: "all") { status errors }
				writeGOPNotes: addPermissionToPermissionGroup(id: $groupId permissionId: "writeGOPNotes" targetId: "all") { status errors }
				readGOPAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "readGOPAttachments" targetId: "all") { status errors }
				writeGOPAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "writeGOPAttachments" targetId: "all") { status errors }
				writeClaimAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "writeClaimAttachments" targetId: "all") { status errors }
				readPermissionSchemas: addPermissionToPermissionGroup(id: $groupId permissionId: "readPermissionSchemas" targetId: "all") { status errors }
				writePermissionSchemas: addPermissionToPermissionGroup(id: $groupId permissionId: "writePermissionSchemas" targetId: "all") { status errors }
				writeServiceItems: addPermissionToPermissionGroup(id: $groupId permissionId: "writeServiceItems" targetId: "all") { status errors }
				readServiceItems: addPermissionToPermissionGroup(id: $groupId permissionId: "readServiceItems" targetId: "all") { status errors }
				writePanelProviderTiers: addPermissionToPermissionGroup(id: $groupId permissionId: "writePanelProviderTiers" targetId: "all") { status errors }
				readPanelProviderTiers: addPermissionToPermissionGroup(id: $groupId permissionId: "readPanelProviderTiers" targetId: "all") { status errors }
				writeTransactionAttachments: addPermissionToPermissionGroup(id: $groupId permissionId: "writeTransactionAttachments" targetId: "all") { status errors }
				readJobSchedules: addPermissionToPermissionGroup(id: $groupId permissionId: "readJobSchedules" targetId: "all") { status errors }
				writeJobSchedules: addPermissionToPermissionGroup(id: $groupId permissionId: "writeJobSchedules" targetId: "all") { status errors }
				readBenefitDefinitions: addPermissionToPermissionGroup(id: $groupId permissionId: "readBenefitDefinitions" targetId: "all") { status errors }
				writeBenefitDefinitions: addPermissionToPermissionGroup(id: $groupId permissionId: "writeBenefitDefinitions" targetId: "all") { status errors }
				readBenefitDefinitionTypes: addPermissionToPermissionGroup(id: $groupId permissionId: "readBenefitDefinitionTypes" targetId: "all") { status errors }
				writeBenefitDefinitionTypes: addPermissionToPermissionGroup(id: $groupId permissionId: "writeBenefitDefinitionTypes" targetId: "all") { status errors }
				readDataSchemas: addPermissionToPermissionGroup(id: $groupId permissionId: "readDataSchemas" targetId: "all") { status errors }
				writeDataSchemas: addPermissionToPermissionGroup(id: $groupId permissionId: "writeDataSchemas" targetId: "all") { status errors }
				readDiagnoses: addPermissionToPermissionGroup(id: $groupId permissionId: "readDiagnoses" targetId: "all") { status errors }
				writeDiagnoses: addPermissionToPermissionGroup(id: $groupId permissionId: "writeDiagnoses" targetId: "all") { status errors }
				readDisabilities: addPermissionToPermissionGroup(id: $groupId permissionId: "readDisabilities" targetId: "all") { status errors }
				writeDisabilities: addPermissionToPermissionGroup(id: $groupId permissionId: "writeDisabilities" targetId: "all") { status errors }
				readIndividualDisabilities: addPermissionToPermissionGroup(id: $groupId permissionId: "readIndividualDisabilities" targetId: "all") { status errors }
				writeIndividualDisabilities: addPermissionToPermissionGroup(id: $groupId permissionId: "writeIndividualDisabilities" targetId: "all") { status errors }
				readTreatments: addPermissionToPermissionGroup(id: $groupId permissionId: "readTreatments" targetId: "all") { status errors }
				writeTreatments: addPermissionToPermissionGroup(id: $groupId permissionId: "writeTreatments" targetId: "all") { status errors }
			}
		`

		await axios.post(
			endpoint,
			{
				variables: {
					groupId
				},
				query: print(query)
			},
			{
				headers: {
					Authorization: `Bearer ${tenantToken}`,
				}
			}
		)
	}

	return async (tenantId, email, username, password, redirectUris, fsConfig) => {
		try {
			console.log(tenantId, email, username, password, redirectUris, fsConfig)

			await executeQuery(
				() => createTenant(tenantId, email, username, password, redirectUris, fsConfig),
				'Creating tenant',
				'Tenant created'
			)

			const tenantToken = await executeQuery(
				() => getToken(tenantId, username, password),
				`Fetching token for ${tenantId}`,
				`Token for ${tenantId} fetched`
			)

			await executeQuery(() => createMailTemplate(tenantToken), 'Creating mail template', 'Mail template created')

			const templateId = await executeQuery(
				() => listTemplates(tenantToken),
				'Listing mail templates',
				'Mail templates listed'
			)

			console.log(templateId)

			await executeQuery(() => updateTemplate(tenantToken, templateId), 'Updating template', 'Template updated')

			const schemas = await executeQuery(() => createSchemas(tenantToken), 'Creating schemas', 'Schemas created')

			console.log(schemas)

			await executeQuery(
				() => updateTenantSchmeas(tenantToken, schemas?.individualFields, schemas?.uiIndividualFields, schemas?.companyDynamicFields, schemas?.companyDynamicFields),
				'Updating tenant schemas',
				'Tenant schemas updated'
			)

			const groupId = await executeQuery(() => createPermissionsGroup(tenantToken), 'Creating permission group', 'Permission group created')
			await executeQuery(() => setAdminPermissions(tenantToken, groupId), 'Setting admin permissions', 'Admin permissions set')
		} catch (e) {
			console.error(e)
		}
	}
}
