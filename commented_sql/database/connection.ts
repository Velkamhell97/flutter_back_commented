import { Sequelize } from 'sequelize';

const db = new Sequelize('flutter_chat','root','', {
  host:'localhost',
  dialect: 'mysql',
  logging: false
})

export default db;