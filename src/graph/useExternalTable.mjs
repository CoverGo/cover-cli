export const useExternalTableQueries = (apiContext) => {
	async function fetchFile(fileName) {
		const reEncodedFileName = encodeURIComponent(decodeURIComponent(fileName))
		return await apiContext.fetchFile(`files/${reEncodedFileName}`)
	}

	return {
		fetchFile,
	}
}

export const useExternalTableMutations = (apiContext) => {
	async function createFile(directory, fileName, data) {
		return await apiContext.createFile(`files/${directory}`, fileName, data)
	}

	return {
		createFile,
	}
}
