let data={}; 
let current=[];

let followDates={};

let currentType="non";


function salvaCache(){

 localStorage.setItem("igAnalyzerCache",JSON.stringify({

  data:data,

  followDates:followDates,

  currentType:currentType,

  search:document.getElementById("search")?.value || "",

  stats:document.getElementById("stats")?.innerHTML || "",

  title:document.getElementById("title")?.innerHTML || "",

  scroll:window.scrollY

 }));

}


function caricaCache(){

 let saved=localStorage.getItem("igAnalyzerCache");

 if(!saved)return;

 try{

  let cache=JSON.parse(saved);


  data=cache.data || {};

  followDates=cache.followDates || {};

  currentType=cache.currentType || "non";

  current=data[currentType] || [];


  if(document.getElementById("stats"))

   document.getElementById("stats").innerHTML=cache.stats || "";


  if(document.getElementById("title"))

   document.getElementById("title").innerHTML=cache.title || "";


  if(document.getElementById("search"))

   document.getElementById("search").value=cache.search || "";


  render();


  setTimeout(()=>{

   window.scrollTo({

    top:cache.scroll || 0,

    behavior:"auto"

   });

  },800);


 }catch(e){

  console.error("Errore caricamento cache",e);

 }

}



function values(obj){

 let out=[];


 function scan(x){

  if(Array.isArray(x))

   x.forEach(scan);


  else if(x && typeof x==="object"){


   if(x.title)

    out.push(x.title);



   if(x.string_list_data)

    x.string_list_data.forEach(a=>{

     if(a.value)

      out.push(a.value);

    });



   if(x.label_values)

    x.label_values.forEach(a=>{

     if(a.label==="Nome utente" && a.value)

      out.push(a.value);

    });



   Object.values(x).forEach(scan);

  }

 }


 scan(obj);


 return [...new Set(out)];

}



async function read(zip,name){

 let f=Object.keys(zip.files).find(x=>x.endsWith(name));


 if(!f)

  return [];


 return values(JSON.parse(await zip.file(f).async("text")));

}




async function readFollowers(zip){

 let files=Object.keys(zip.files).filter(x=>

   /followers_\d+\.json$/i.test(x)

 );


 let all=[];


 for(let f of files){

   let json=JSON.parse(await zip.file(f).async("text"));

   all.push(...values(json));

 }


 return [...new Set(all)];

}





async function readFollowingAll(zip){


 let files=Object.keys(zip.files).filter(x=>

   /following(_\d+)?\.json$/i.test(x)

 );



 let all=[];



 for(let f of files){


   let json=JSON.parse(await zip.file(f).async("text"));



   function scan(x){


    if(Array.isArray(x))

     x.forEach(scan);



    else if(x && typeof x==="object"){


     if(x.title){


      all.push(x.title);



      if(

       x.string_list_data &&

       x.string_list_data[0] &&

       x.string_list_data[0].timestamp

      ){


       followDates[x.title]=new Date(

        x.string_list_data[0].timestamp*1000

       ).toLocaleDateString("it-IT");


      }


     }



     Object.values(x).forEach(scan);


    }


   }


   scan(json);


 }



 return [...new Set(all)];

}

async function analizza(){

 let file=document.getElementById("file").files[0];

 if(!file)return alert("Seleziona ZIP");


 let zip=await JSZip.loadAsync(file);


 let followers=await readFollowers(zip);

 let following=await readFollowingAll(zip);

 let pending=await read(zip,"pending_follow_requests.json");

 let recent=await read(zip,"recent_follow_requests.json");


 data.followers=followers;

 data.following=following;

 data.non=following.filter(x=>!followers.includes(x));

 data.fan=followers.filter(x=>!following.includes(x));

 data.pending=pending;

 data.recent=recent;


 document.getElementById("stats").innerHTML=

 `<div class="stat">
   <div class="number">${followers.length}</div>
   <div class="label">Followers totali</div>
  </div>

  <div class="stat">
   <div class="number">${following.length}</div>
   <div class="label">Account seguiti</div>
  </div>

  <div class="stat">
   <div class="number">${data.non.length}</div>
   <div class="label">Account che segui ma non ti seguono</div>
  </div>

  <div class="stat">
   <div class="number">${data.fan.length}</div>
   <div class="label">Account che ti seguono ma che non segui</div>
  </div>

  <div class="stat">
   <div class="number">${pending.length}</div>
   <div class="label">Richieste di follow in sospeso</div>
  </div>`;


 mostra("non");

 salvaCache();

}



function mostra(tipo){

 currentType=tipo;

 current=data[tipo]||[];


 let titles={

  non:"❌ Account che segui ma che non ti seguono",

  fan:"👥 Account che ti seguono ma che non segui",

  pending:"⏳ Richieste di follow in sospeso",

  recent:"📤 Richieste inviate"

 };


 document.getElementById("title").innerHTML=

 "<h2>"+(titles[tipo]||tipo)+"</h2>";


 render();

 salvaCache();

}



function render(){

 let q=document.getElementById("search").value.toLowerCase();


 document.getElementById("list").innerHTML=

 current

 .filter(x=>x.toLowerCase().includes(q))

 .map(x=>

  `<div class="item">
    <div>
     <a class="account-link" target="_blank" href="https://instagram.com/${x}">@${x}</a>
     ${
      (followDates[x] && data.non && data.non.includes(x))
      ?
      `<div style="font-size:12px;color:#94a3b8;margin-top:4px">
       Segui dal ${followDates[x]}
      </div>`
      :
      ""
     }
    </div>
   </div>`

 )

 .join("");


 salvaCache();

}



function pulisciTutto(){

 if(!confirm("Vuoi davvero cancellare tutti i dati dell'analisi e la sessione salvata?")) return;


 localStorage.removeItem("igAnalyzerCache");


 data={};

 current=[];

 followDates={};

 currentType="non";


 document.getElementById("stats").innerHTML="";

 document.getElementById("title").innerHTML="";

 document.getElementById("list").innerHTML="";

 document.getElementById("search").value="";

 document.getElementById("file").value="";


 window.scrollTo(0,0);

}



let scrollTimer;


window.addEventListener("scroll",()=>{

 clearTimeout(scrollTimer);


 scrollTimer=setTimeout(()=>{

  salvaCache();

 },500);

});


window.addEventListener("beforeunload",()=>{

 salvaCache();

});


window.addEventListener("DOMContentLoaded",caricaCache);