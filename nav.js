// /nav.js  (pure JS!)
(function(){
  function canon(path){
    return (path||'/')
      .replace(/\/index\.html$/i,'/')
      .replace(/\.html$/i,'')
      .replace(/\/$/,'');
  }
  function mountNav(){
    var m = document.getElementById('navMount');
    if(!m) return;
    fetch('/nav.html',{cache:'no-store'})
      .then(function(r){return r.text()})
      .then(function(html){
        m.innerHTML = html;
        try{
          var here = canon(location.pathname);
          m.querySelectorAll('[data-nav]').forEach(function(a){
            var href = a.getAttribute('href')||'/';
            var target = canon(href);
            if(here === target){ a.classList.add('active'); }
          });
        }catch(e){}
      })
      .catch(function(){ /* ignore */ });
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', mountNav); }
  else{ mountNav(); }
})();
