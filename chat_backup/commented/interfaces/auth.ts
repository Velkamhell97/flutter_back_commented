import { Request as req,  Response as res } from 'express';

import { Document, Types } from 'mongoose';
import { User } from '../models/user';

export interface AuthRequest extends req {
  body : AuthBody,
}

interface AuthBody {
  //->Puedo asegurar que tienen valores por el schema del auth (no necesitan el ?:)
  email : string,
  password : string
}

export interface AuthResponse extends res {
  locals: AuthLocals
}

interface AuthLocals {
  //-> Puedo asegurar que va un objeto ya que solo se establece cuando se encuentra el user (no necesita el ?:)
  authUser : Document<unknown, any, User> & User & {
    _id: Types.ObjectId;
  },
  logedUser : Document<unknown, any, User> & User & {
    _id: Types.ObjectId;
  },
}
