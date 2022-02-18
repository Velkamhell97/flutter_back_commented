import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin, Association, HasManyGetAssociationsMixin, NonAttribute } from 'sequelize';
import db from '../database/connection';
import { User, Product } from './index';

class Category extends Model<InferAttributes<Category, {omit: 'products'}>, InferCreationAttributes<Category, {omit: 'products'}>> {
  declare id        : CreationOptional<number>;
  declare name      : string;
  declare lower     : CreationOptional<string>;
  declare ownerId   : number;
  declare state     : CreationOptional<boolean>;

  //-Recordar que para cada tipo de relacion podemos especificar una funcion auxiliar para interactuar
  //-con el modelo de interaccion
  declare getProducts: HasManyGetAssociationsMixin<Product>; // Note the null assertions!

  declare getUser: BelongsToGetAssociationMixin<User>;
  declare createUser: BelongsToCreateAssociationMixin<User>;

  declare products ?: NonAttribute<Category[]>;

  declare static associations: {
    user: Association<Category, User>;
    products: Association<Category, Product>;
  }
}

Category.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: new DataTypes.STRING(50), allowNull: false },
    lower: new DataTypes.STRING(50),
    ownerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    state: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    //->El scope sirve para crear unos tipos de labels (scopes) en donde se definen unos parametros
    //-de busqueda predefinidos, como where, o en este caso el populate con el include
    //-con esto se reduce que tener que escribir esta linea en cada peticion find de la db
    //-no funciona con metodos de las relaciones ni con metodos como create
    //-tener en cuenta que este scope queda tambien asignados para los demas modelos o tablas
    //-que hagan un populate de category, por eso en algunos casos es mejor manejarla manual o 
    //-crear diferentes scopes
    defaultScope: {
      //si se deja este por defecto se mostrara en las demas collecciones
      // include: { model: User, as: 'user', attributes: ['name'] }
    },
    scopes: {
      //-para que se utilice de una manera mas flexible
      withUser: {
        include: { model: User, as: 'user', attributes: ['name'] }
      }
    },
    tableName: 'categories',
    timestamps: true,
    sequelize: db,
  }
);

Category.beforeSave(category => {
  if(!category.name) return;

  const trim = category.name.split(' ').filter(i => i).join(' ');

  category.name  = trim.charAt(0).toUpperCase() + trim.substring(1).toLowerCase();
  // this.lower = this.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""); --> Quitar acentos

  category.lower = category.name.toLowerCase();
});

//-Esta sintaxis esta mal ya que la categoria no contiene usuarios
// Category.hasOne(User, { as: 'user' })

//Esta categoria esta bien porque las categorias deben tener un userId, pero como en el user ya se definio
//-el hasMany, no se sabe si aqui tambien sea necesaria (en el ejemplo no se hace)
// Category.belongsTo(User, {foreignKey: 'ownerId', targetKey: 'id', as:'user'} );

export default Category;