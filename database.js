const mongo = require('mongodb');

let client = new mongo.MongoClient("mongodb+srv://" + 
encodeURIComponent(process.env.dbUser) + ":" 
+ encodeURIComponent(process.env.dbpass)+
"@" + encodeURIComponent(process.env.dbCluster) + "/" + encodeURIComponent(process.env.dbDatabase) + "?retryWrites=true&w=majority", 
{ useNewUrlParser: true, useUnifiedTopology: true });

module.exports = {
  getDb: async function() {
    await client.connect();
    return client.db('db');
  },
};