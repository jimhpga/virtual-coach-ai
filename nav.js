<!-- /nav.js -->
<script>
(function(){
  function mountNav(){
    var m = document.getElementById('navMount');
    if(!m) return;
    fetch('/nav.html',{cache:'no-store'})
      .then(function(r){ return r.text(); })
      .then(function(html){
        m.innerHTML = html;
        // highlight active link
        try{
          var here = (location.pathname.replace(/\/index\.html$/,'/') || '/');
          m.querySelectorAll('[data-nav]').forEach(function(a){
            if(a.getAttribute('href') === here){ a.classList.add('active'); }
          });
        }catch(e){}
      })
      .catch(function(){ /* ignore */ });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', mountNav);
  }else{
    mountNav();
  }
})();
</script>
