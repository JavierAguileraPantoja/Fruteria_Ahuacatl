const mongoose = require('mongoose');
const{mongodb}= require('./keys')

mongoose.connect(mongodb.URI,{})
    .then(db => console.log('BASE DE DATOS CONECTADA'))
    .catch(err => console.error(err));