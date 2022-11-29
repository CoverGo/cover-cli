export function getProductIdFromString(productId) {
	const [version, type, ...rest] = productId.split('/').reverse()
	const plan = rest.reverse().join('/')

	return {
		plan,
		type,
		version
	}
}