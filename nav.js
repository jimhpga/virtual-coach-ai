// /nav.js
(function(){
  function canon(path){
    return (path||'/')
      .replace(/\/index\.html$/i,'/')
      .replace(/\.html$/i,'')
      .replace(/\/$/,'');
  }
  function mountNav(){
    var m = document.getElementById('navMount'); if(!m) return;
    fetch('/nav.html',{cache:'no-store'})
      .then(r=>r.text())
      .then(html=>{
        m.innerHTML = html;
        try{
          var here = canon(location.pathname);
          m.querySelectorAll('[data-nav]').forEach(a=>{
            var target = canon(a.getAttribute('href')||'/');
            if(here===target){ a.classList.add('active'); }
          });
        }catch(e){}
      })
      .catch(()=>{});
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', mountNav); }
  else{ mountNav(); }
})();
