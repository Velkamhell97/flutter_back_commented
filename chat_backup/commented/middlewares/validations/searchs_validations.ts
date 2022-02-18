import { NextFunction, Request, Response } from "express";

export const validateCollection = async (req: Request, res: Response, next: NextFunction) => {
  //->Aqui solo se valida que la coleccion exista dentro de un grupo de colecciones definidas
  const { collection } = req.params;

  //->Como esta es la unica ruta que llama este middleware no se pasa este arreglo como argumento
  const collections = ['users', 'categories', 'products'];

  //->No necesitamos enviar ningun id o objeto porque no hacemos ninguna peticion a la db
  if(!collections.includes(collection.toLowerCase())) {
    return res.status(401).json({
      msg: `No one collection match with \'${collection}\' `,
      error: 'Collection not found',
    })
  }

  next();
}