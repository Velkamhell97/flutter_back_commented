import { Request } from 'express';
import { Document, Types } from 'mongoose';

import { User } from '../models';

export interface UsersRequest extends Request {
  body : UsersBody
}

//-Para el caso de sql cuando se define el modelo con tipado estricto, se hace necesario hacer unas modificaciones
//-a la interfaz del body. en mongoose definiamos estos campos como opcionales porque en el body al momento
//-de hacer un update puede que no vaya ningun parametro y asi se hacen las validaciones, sin embargo para el caso de
//-sql al momento de crear es necesario obligatoriamente que vayan los campos especificados (si se definen asi)
//-por lo que establecer los valores como opcionales se tendrian que castiar todos con el ! al momento de crear
//-el usuario, lo cual es ineficiente por ejemplo cuando son muchos parametros, entonces hay 3 soluciones

//-1. la primera es establecer estos parametros como obligatorios, de esta manera al momento del create no tendra
//-problema y en el momento del update cuando se valida si viene un password por ejemplo, se puede usar la misma
//validacion del !password, y aunque no se tenga marcado como opcional si no viene mostrara undefined, de esta manera
//-tambien subiremos al update unicamente los campos cambiados (ESCOGIDA)

//-2. la segunda solucion es declarar todos los atributos del modelo como opcionales en la creacion de esta manera
//-permitira que se pase cualquier objeto en la creacion y asi no tendriamos que cambiar el tipado de aqui y dejar
//-el ?, al momento del update no hay problema

//-3. finalmente la ultima solucion es crear el modelo con un tipado no tan estricto como se hacia en versiones anteriores
//-que daria un resultado similar al de mongoose
interface UsersBody {
  name : string,
  email : string,
  password : string,
  role ?: string,
  roleId : number,
  // state ?: boolean, //-no necesario con el soft delete
  avatar ?: string
  // [rest: string] : string | boolean | undefined
}

export type UserDocument = Document<unknown, any, User> & User & { _id: Types.ObjectId };

