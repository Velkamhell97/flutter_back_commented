import { Request, Response } from "express";
import { Op } from "sequelize";

import { catchError, errorTypes } from "../errors";
import { Category, Product, User } from "../models";


/**
 * @controller /api/search/:collection/:query : GET
 */
export const searchController = async (req: Request, res: Response) => {
  const { collection, query } = req.params;

  let searchObject = [{}]; //->objeto de busqueda
  
  let results : any[] = []; //->para el tipado
  
  if(!isNaN(parseInt(query))){
    searchObject = [{id: query}]; //->Busqueda por id
  } else {
    const prefix = {[Op.like] : "%" + query.toLowerCase() + "%"};

    switch(collection.toLowerCase()) {
      case 'users':
        searchObject = [{name: prefix}, {email: prefix}];
        break;
      case 'categories':
        searchObject = [{name: prefix}];
        break;
      case 'products':
        searchObject = [{name: prefix}, {description: prefix}];
        break;
    }
  }

  try {
    switch(collection.toLowerCase()) {
      //los querys tienen la validacion del softdelete
      case 'users':
        results = await User.findAll({where: {[Op.or]: searchObject}})
        break;
      case 'categories':
        results = await Category.findAll({where: {[Op.or]: searchObject}})
        break;
      case 'products':
        results = await Product.findAll({where: {[Op.or]: searchObject}})
        break;
    }

    return res.json({msg:'search successfully', results});
  } catch (error) {
    return catchError({error, type: errorTypes.search_documents, res});
  }
}