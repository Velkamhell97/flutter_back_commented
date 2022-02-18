import { Request as req,  Response as res } from 'express';
import { Document, Types } from 'mongoose';

import { Category } from '../models/category';
import { User } from '../models/user';

export interface CategoriesRequest extends req {
  body : CategoriesBody,
  // query: 
}

interface CategoriesBody {
  //->Como el name es opcional debe poner el ?:
  name ?: string,
  state ?: boolean,
  //->En mongo el _id es el objectId y el id es el string, mongo recibe cualquiera
  user ?: Types.ObjectId | string
  //->Como extraemos varaibles que no deban ser manipuladas y las volvemos a asignar necesitamos dejar otras variables
  // [rest: string] : string | boolean | undefined
}

export interface CategoriesResponse extends res {
  locals: CategoriesLocals,
}

interface CategoriesLocals {
  //->Puedo asegurar que estos elementos tienen valores porque yo los seteo antes de usarlos
  category: Document<unknown, any, Category> & Category & {
    _id: Types.ObjectId;
  },
  authUser: Document<unknown, any, User> & User & {
    _id: Types.ObjectId;
  },
}