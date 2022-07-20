require('dotenv').config()
const Contract = require('web3-eth-contract')
const axios = require('axios')
const fs = require('fs')
const fsPromises = fs.promises
const path = require('path')
const mongoose = require('mongoose');
const {PoolSnapshot} = require('./model/pool_snapshot')


// Constants (from ENV variables)
const API_KEY = process.env.API_KEY
const PROVIDER = process.env.PROVIDER
const USER_ADDR = process.env.USER_ADDR
const CSV_PATH = path.join(process.env.SAVE_PATH, process.env.SAVE_NAME)

// get all pool contract addresses
const CONTRACT_ADDR_LIST = []
let counter = 1
while (true) {
	if (process.env[`CONTRACT_ADDR_${counter}`] !== undefined) {
		// contract addr found, add to list
		CONTRACT_ADDR_LIST.push(process.env[`CONTRACT_ADDR_${counter}`])
	} else {
		break
	}
	counter++
}
if (CONTRACT_ADDR_LIST.length <= 0) {
	console.error('No pool addresses detected, terminating...')
	process.exit(1)
}
console.log(`${counter - 1} pool addresses found.`)

async function getABI(contract_addr) {
	try {
		const res = await axios.get(`https://api.etherscan.io/api?module=contract&action=getabi&address=${contract_addr}&apikey=${API_KEY}`)
		return JSON.parse(res.data.result)
	} catch (e) {
		return undefined
	}
}

async function scrapeBalance(abi, contract_addr) {
	const MyContract = new Contract(abi, contract_addr)
	const {shares} = await MyContract.methods.userBalance(USER_ADDR).call()
	const res = await MyContract.methods.sharesToAmount(shares).call()
	let balance = res / 1000000000000000000
	return balance.toFixed(2)
}

async function main() {

	// connect to database
	console.log('Attempt to connect ot MongoDB')
	mongoose.connect('mongodb://localhost:27017/cartesi_pool')
	.then(() => {
		console.log('Connected to database')
	})
	.catch((e) => {
		console.error('Failed to connect to database: ' + e)
		process.exit(1)
	})

	// connect to ethereum gateway
	console.log('Setting provider...')
	Contract.setProvider(PROVIDER)
	// read all contract
	for (let i = 0; i < CONTRACT_ADDR_LIST.length; i++) {
		// get contract ABI
		console.log(`[pool ${i}] contract address ${CONTRACT_ADDR_LIST[i]}`)
		console.log(`[pool ${i}] reading ABI...`)
		const abi = await getABI(CONTRACT_ADDR_LIST[i])
		if (abi === undefined) {
			console.warn(`[pool ${i}] failed to fetch balance`)
		} else {
			// read user balance from contract
			const balance = await scrapeBalance(abi, CONTRACT_ADDR_LIST[i])
			console.log(`[pool ${i}] balance: ${balance}`)
			// create a snapshot
			const snapshot = new PoolSnapshot({
				pool_addr: CONTRACT_ADDR_LIST[i],
				time: new Date(),
				balance: balance,
			})
			// push to database
			await snapshot.save()
		}
	}
	// disconnect from ethereum gateway and MongoDB
	Contract.currentProvider.disconnect()
	mongoose.connection.close()
}

main()