import { Request as req,  Response as res } from 'express';
import { FileArray, UploadedFile } from 'express-fileupload';
import { Document, Types } from 'mongoose';

import { User } from '../models/user';

export interface UsersRequest extends req {
  //->En el body no se tienen propiedades tipadas por eso no hay mayor problema al asignarle uno
  body : UsersBody
  files ?: UsersFiles
}

interface UsersFiles extends FileArray {
  avatar: UploadedFile
}

interface UsersBody {
  //->Como el email y password puede ser opcional al actualizar se debe poner el ?:
  email ?: string,
  password ?: string,
  role ?: string,
  state ?: boolean,
  avatar ?: string
  //->Como extraemos varaibles que no deban ser manipuladas y las volvemos a asignar necesitamos dejar otras variables
  // [rest: string] : string | boolean | undefined
}

export interface UsersResponse extends res {
  //->Los locals tienen un tipado (Record<string,any>) muy basico por eso tambien se puede sobreescribir
  locals: UsersLocals
}

interface UsersLocals {
  //->Puedo asegurar que estos elementos tienen valores porque yo los seteo antes de usarlos
  user: Document<unknown, any, User> & User & {
    _id: Types.ObjectId;
  }, 
  //->El avatar puede que venga o no en las locals
  avatar: UploadedFile | undefined
}


