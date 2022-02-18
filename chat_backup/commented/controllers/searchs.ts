import { Request, Response } from "express";
import { isValidObjectId, Document } from "mongoose";

import { Category, Product, User } from "../../models";


/**
 * @path /api/search/:collection/:query : GET
 */
export const searchController = async (req: Request, res: Response) => {
  //-Aqui ya es seguro que la colleccion es valida, el query puede ser cualquier string 
  const { collection, query } = req.params;

  //->Recolector de los parametros de busqueda
  let searchObject = [{}];

  //->Resultados si se ingresa un query invalido o no manjado solo devolvera vacio, no podemos tipar esto porque
  //-cambian con cada posible, entonces se establece una clase general de documents
  let results : Document[] = [];
  
  if(isValidObjectId(query)){
    searchObject = [{_id: query}]; //->Busqueda por id
  } else {
    const prefix = new RegExp(query.toLowerCase(), 'i'); //->Match en cualquier parte

    //->Se cambian los criterios de busqueda segun la categoria
    switch(collection.toLowerCase()) {
      case 'users':
        searchObject = [{name: prefix}, {email: prefix}];
        break
      case 'categories':
        searchObject = [{name: prefix}];
        break;
      case 'products':
        searchObject = [{name: prefix}, {description: prefix}];
        break;
    }
  }

  //->Dependiendo de la categoria se hace la peticion al modelo correspondiente, todas deben tener el state en true
  try {
    switch(collection.toLowerCase()) {
      case 'users':
        results = await User.find({$or: [...searchObject], $and: [{state:true}]});
        break
      case 'categories':
        results = await Category.find({$or: [...searchObject], $and: [{state:true}]});
        break;
      case 'products':
        results = await Product.find({$or: [...searchObject], $and: [{state:true}]});
        break;
    }

    return res.json({
      msg:'search successfully',
      results
    })
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      msg: 'search failed',
      error,
    })
  }
}