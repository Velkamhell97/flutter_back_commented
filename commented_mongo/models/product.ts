import { model, Schema, Types } from "mongoose";

//-Recordar que es trabajo del frontend enviar las cosas de la manera correcta y formatear las respuesta
//-del servidor como fechas y numeros, tambien es trabajo de este enviar los textos de una manera
//-ordenada y valida

export interface Product {
  name         : string,
  lower        : string,
  user         : Types.ObjectId,
  price        : number,
  img         ?: string,
  category     : Types.ObjectId,
  description  : string,
  available    : boolean,
  state        : boolean,

  // books      : BookInterface[]
  // names      : string[]
  // comments      : string[]
  // social     : Map<string, string>
}

const productSchema = new Schema<Product>({
  name        : { type: String, required: [true, 'The name is required'], unique: true 
  //-Validaciones personalizadas a los capos, si arroja false no guarda el registro
    // validate: {
    //   validator: (v:string) => {},
    //   message: 'error'
    // }
},
  lower       : String,
  user        : { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'The user is required'] },
  price       : { type: Number, required: [true, 'The price is required'] },
  img         : String,
  category    : { type: Schema.Types.ObjectId, ref: 'Category', required: [true, 'The category is required'] },
  description : { type: String, default: 'Sin descripcion' },
  available   : { type: Boolean, default: true },
  state       : { type: Boolean, default: true },
}, {
  timestamps: { createdAt: 'created', updatedAt: 'updated' },
  collation: { locale: 'en_US', strength: 1 }
})

productSchema.pre('save', function(this: Product, next) {
  const trim = this.name.split(' ').filter(i => i).join(' ');

  this.name  = trim.charAt(0).toUpperCase() + trim.substring(1).toLowerCase();
  // this.lower = this.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""); --> Quitar acentos
  this.lower = this.name.toLowerCase();

  next();
})

productSchema.pre('findOneAndUpdate', function(next) {
  let update = {...this.getUpdate()} as { name:string, lower:string };

  if(!update.name){
    return next()
  }

  const trim = update.name.split(' ').filter(i => i).join(' ');

  update.name  = trim.charAt(0).toUpperCase() + trim.substring(1).toLowerCase();
  // this.lower = this.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  update.lower = update.name.toLowerCase();

  this.setUpdate(update);

  next();
})

productSchema.methods.toJSON = function() {
  const { __v, state, ...product } = this.toObject();
  return product;
}

const productModel = model<Product>('Product', productSchema);

export default productModel;