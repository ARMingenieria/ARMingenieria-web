
(function(){
  const btn=document.querySelector('[data-menu-btn]'); const menu=document.querySelector('[data-menu]');
  if(btn&&menu){btn.addEventListener('click',()=>{const open=menu.classList.toggle('is-open');btn.setAttribute('aria-expanded',String(open));});}
  const form=document.querySelector('[data-contact-form]');
  if(form){form.addEventListener('submit',function(e){e.preventDefault(); const data=new FormData(form); const nombre=(data.get('nombre')||'').trim(); const telefono=(data.get('telefono')||'').trim(); const email=(data.get('email')||'').trim(); const servicio=data.get('servicio')||'Consulta'; const mensaje=(data.get('mensaje')||'').trim(); if(!nombre||!telefono||!mensaje){alert('Completa nombre, teléfono y mensaje.');return;} const subject=encodeURIComponent('Consulta desde arm-ingenieria.com - '+servicio); const body=encodeURIComponent('Nombre/Empresa: '+nombre+'\nTeléfono: '+telefono+'\nCorreo: '+email+'\nTipo de consulta: '+servicio+'\n\nMensaje:\n'+mensaje+'\n\nEnviado desde arm-ingenieria.com'); window.location.href='mailto:alejandro@armingenieria.com?subject='+subject+'&body='+body;});}
})();
