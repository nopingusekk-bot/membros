const {sql,json,getCookie,hashToken,clearCookie}=require('../_lib');
module.exports=async(req,res)=>{if(req.method!=='POST')return json(res,405,{error:'Método não permitido'});try{const t=getCookie(req);if(t)await sql`delete from sessions where token_hash=${hashToken(t)}`;clearCookie(res);return json(res,200,{ok:true})}catch(e){return json(res,500,{error:'Erro interno'})}};
