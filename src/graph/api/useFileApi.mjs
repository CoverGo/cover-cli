import { createRestGetRequest, createRestPostRequest } from './api.js'
import FormData from 'form-data'
import { getTenantWithEnvironment } from '../../config/config.mjs'
import { fetchNewToken } from '../../login/login.mjs'

export async function useFileApi(alias) {
  const tenant = await getTenantWithEnvironment(alias)
  const token = await fetchNewToken(tenant.environment, tenant)
	const get = createRestGetRequest(tenant.environment, token)
	const post = createRestPostRequest(tenant.environment, token)

  async function fetchFile(fileName) {
    const file = await get(fileName)
	  return file.data
	}

	async function createFile(directory, fileName, content) {
		const text = JSON.stringify(content)
		const blob = Buffer.from(text)

		const formData = new FormData()
		formData.append(
			"file",
			blob,
			{
				filename: fileName
			}
		)

		await post(
			directory,
			formData
		)
	}

	return {
		fetchFile,
		createFile
	}
}