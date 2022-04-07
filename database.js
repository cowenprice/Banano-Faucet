const mongo = require('mongodb');

let client = new mongo.MongoClient("mongodb+srv://faucet:"+encodeURIComponent(process.env.dbpass)+"@cluster0.yfoby.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true })

module.exports = {
  getDb: async function() {
    await client.connect();
    return client.db('db');
  },
};