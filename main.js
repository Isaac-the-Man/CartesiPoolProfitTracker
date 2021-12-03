require('dotenv').config()
const Contract = require('web3-eth-contract')
const axios = require('axios')
const fs = require('fs')
const fsPromises = fs.promises
const path = require('path')


// Constants (from ENV variables)
const API_KEY = process.env.API_KEY
const PROVIDER = process.env.PROVIDER
const USER_ADDR = process.env.USER_ADDR
const CONTRACT_ADDR = process.env.CONTRACT_ADDR
const CSV_PATH = path.join(process.env.SAVE_PATH, process.env.SAVE_NAME)

async function getABI() {
	try {
		const res = await axios.get(`https://api.etherscan.io/api?module=contract&action=getabi&address=${CONTRACT_ADDR}&apikey=${API_KEY}`)
		return JSON.parse(res.data.result)
	} catch (e) {
		console.log(e)
		return undefined
	}
}

async function scrapeBalance(abi) {
	const MyContract = new Contract(abi, CONTRACT_ADDR)
	const {shares} = await MyContract.methods.userBalance(USER_ADDR).call()
	const res = await MyContract.methods.sharesToAmount(shares).call()
	let balance = res / 1000000000000000000
	return balance.toFixed(2)
}

async function saveCSV(balance) {
	const now = new Date()
	const content = `${now.toISOString()},${balance}\n`
	try {
		await fsPromises.appendFile(CSV_PATH, content)
		console.log('successfully saved.')
	} catch(e) {
		console.log(e)
	}
}

async function main() {
	Contract.setProvider(PROVIDER)
	const abi = await getABI()
	if (abi !== undefined) {
		const balance = await scrapeBalance(abi)
		console.log(balance)
		saveCSV(balance)
	}
	Contract.currentProvider.disconnect()
}

main()