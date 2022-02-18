import { Request,Response } from 'express';
import { Document, Types } from 'mongoose';
import { User } from '../models/user';

//->Explicacion en el users de este folder
export interface AuthRequest extends Request {
  body : AuthBody,
}

interface AuthBody {
  email : string,
  password : string
}

//->Explicacion en el users de este folder
// export interface AuthResponse extends Response {
//   locals: AuthLocals
// }

// interface AuthLocals {
//   authUser : Document<unknown, any, User> & User & {
//     _id: Types.ObjectId;
//   },
//   logedUser : Document<unknown, any, User> & User & {
//     _id: Types.ObjectId;
//   },
// }