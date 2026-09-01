const {json,requireAuth,ensureDatabase}=require('../_lib');
module.exports=async(req,res)=>{try{await ensureDatabase();}catch(e){console.error(e);return json(res,500,{error:'Banco de dados não configurado'})}const u=await requireAuth(req,res);if(!u)return;return json(res,200,{user:u})};
