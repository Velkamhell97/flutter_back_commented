import express, { Application } from 'express';
import cors from 'cors';
import http from 'http';
import socketIO = require('socket.io');

import cloudinary from './cloudinary';

import dbConnection from '../database/config';

import socketController from '../sockets/controller';

import { 
  AuthRouter, 
  UsersRouter, 
  CategoriesRouter, 
  RolesRouter, 
  ProductsRouter, 
  SearchsRouter,
  UploadsRouter
} from '../routes';

import db from '../database/connection';

import { User, Category, Product, Role } from './index';

class Server {
  private app : Application;
  private port : string;

  private server: http.Server;
  private io : socketIO.Server;

  private paths;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || '8080';

    this.server = http.createServer(this.app);
    this.io = new socketIO.Server(this.server);

    this.paths = {
      roles      : '/api/roles',
      auth       : '/api/auth',
      users      : '/api/users',
      categories : '/api/categories',
      products   : '/api/products',
      searchs    : '/api/searchs',
      uploads    : '/api/uploads'
    } 
    
    cloudinary.init();

    this.database();

    this.middlewares();

    this.routes();

    this.sockets();

    
  }

  async database(){
    await dbConnection();

    //->Como el objeto db es el que se utiliza para todas las conexiones no podemos crear una funcion aparte
    try {
      await db.authenticate();
      
      await Role.sync();
      await User.sync();
      await Category.sync();
      await Product.sync();

      console.log('Mysql Online')
    } catch (error) {
      console.log(error);
      throw new Error('Error Triying To Connect With Database');
    }
  }

  middlewares() {
    this.app.use(cors());

    this.app.use(express.json());

    this.app.use(express.static('public'))

    // this.app.use(fileUpload({useTempFiles : true, createParentPath:true, tempFileDir : '/tmp/'}));
  }

  routes() {
    this.app.use(this.paths.roles, RolesRouter);

    this.app.use(this.paths.auth, AuthRouter);
    
    this.app.use(this.paths.users, UsersRouter);

    this.app.use(this.paths.categories, CategoriesRouter);

    this.app.use(this.paths.products,  ProductsRouter);

    this.app.use(this.paths.searchs, SearchsRouter);

    this.app.use(this.paths.uploads, UploadsRouter);
  }

  sockets() {
    this.io.on('connection', (socket) => socketController(socket, this.io));
  }

  listen() {
    this.server.listen(this.port, () => {
      console.log(`Server Listening in port ${this.port}`);
    })
  }
}

export default Server;
