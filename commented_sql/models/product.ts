import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin, Association } from 'sequelize';
import db from '../database/connection';
import { Category, User } from './index';


class Product extends Model<InferAttributes<Product>, InferCreationAttributes<Product>> {
  declare id          : CreationOptional<number>;
  declare name        : string;
  declare lower       : CreationOptional<string>;
  declare ownerId     : number;
  declare price       : CreationOptional<number>;
  declare img         : CreationOptional<string>;
  declare categoryId    : number;
  declare description : CreationOptional<string>;
  declare available   : CreationOptional<boolean>;
  declare state       : CreationOptional<boolean>;

  // declare getUser: BelongsToGetAssociationMixin<User>;
  // declare createUser: BelongsToCreateAssociationMixin<User>;

  // declare static associations: {
  //   user: Association<Product, User>;
  // }
}

Product.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: new DataTypes.STRING(50), allowNull: false },
    lower: new DataTypes.STRING(50),
    ownerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    //-con el metodo increment se puede causar incrementos de un campo en especifico
    price : { type: DataTypes.DECIMAL(10,2), defaultValue: 0.0 },
    img: new DataTypes.STRING(255),
    categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    description: { type: new DataTypes.STRING(255), defaultValue: 'Sin descripción'},
    available: { type: DataTypes.BOOLEAN, defaultValue: true },
    state: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    scopes: {
      withDetails: {
        include: [
          { model: User, as: 'user', attributes: ['name'] },
          { model: Category, as: 'category', attributes: ['name'] }
        ],
      }
    },
    tableName: 'products',
    timestamps: true,
    sequelize: db,
  }
);

Product.beforeSave(product => {
  if(!product.name) return;

  const trim = product.name.split(' ').filter(i => i).join(' ');

  product.name  = trim.charAt(0).toUpperCase() + trim.substring(1).toLowerCase();
  // this.lower = this.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""); --> Quitar acentos

  product.lower = product.name.toLowerCase();
});


export default Product;