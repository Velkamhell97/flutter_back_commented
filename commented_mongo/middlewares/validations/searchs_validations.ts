import { Request, Response, NextFunction } from "express";
import { catchError, errorTypes } from "../../errors";

export const validateCollection = async (req: Request, res: Response, next: NextFunction) => {
  //->Aqui solo se valida que la coleccion exista dentro de un grupo de colecciones definidas
  const { collection } = req.params;

  //->Como esta es la unica ruta que llama este middleware no se pasa este arreglo como argumento
  const collections = ['users', 'categories', 'products'];

  //->No necesitamos enviar ningun id o objeto porque no hacemos ninguna peticion a la db
  if(!collections.includes(collection.toLowerCase())) {
    return catchError({
      type: errorTypes.collection_not_found,
      extra: `Collection \'${collection}\' is not available, collections availables: ${collections}`,
      res
    });
  }

  next();
}