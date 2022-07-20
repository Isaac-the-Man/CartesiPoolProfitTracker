const mongoose = require('mongoose');


const Schema = mongoose.Schema;

const poolSnapshotSchema = new Schema({
	pool_addr: String,
	time: Date,
	balance: Number,
});

const PoolSnapshot =  mongoose.model('PoolSnapshot', poolSnapshotSchema);

module.exports.PoolSnapshot = PoolSnapshot