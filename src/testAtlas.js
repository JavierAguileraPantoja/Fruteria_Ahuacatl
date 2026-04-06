const mongoose = require("mongoose");

const uri = "mongodb://fruteria_user:TU_PASSWORD@ac-zrzszea-shard-00-00.mxgariv.mongodb.net:27017,ac-zrzszea-shard-00-01.mxgariv.mongodb.net:27017,ac-zrzszea-shard-00-02.mxgariv.mongodb.net:27017/fruteria-user?ssl=true&replicaSet=atlas-uds3qb-shard-0&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => {
    console.log("✅ CONECTADO A ATLAS");
    process.exit();
  })
  .catch(err => {
    console.error("❌ ERROR:", err);
    process.exit();
  });
