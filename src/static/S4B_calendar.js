var cal = {
  // (A) PROPERTIES
  // (A1) FLAGS & DATA
  mon : false, // segunda-feira primeiro
  events : null, // dados de eventos para o mês/ano atual
  sMth : 0, // mês selecionado
  sYear : 0, // ano selecionado
  sDIM : 0, // número de dias no mês selecionado
  sF : 0, // primeira data do mês selecionado (yyyymmddhhmm)
  sL : 0, // última data do mês selecionado (yyyymmddhhmm)
  sFD : 0, // primeiro dia do mês selecionado (mon-sun)
  sLD : 0, // último dia do mês selecionado (mon-sun)
  ready : 0, // para rastrear o carregamento

  // (A2) HTML ELEMENTOS
  hMth : null, hYear : null, // mês e ano
  hCD : null, hCB : null, // dias corridos e corpo
  hFormWrap : null, hForm : null, // formulário de evento
  hfID : null, hfStart : null, // campos do formulário de evento
  hfEnd : null, hfTxt : null,
  hfColor : null, hfBG : null,
  hfDel : null,

  // (A3) FUNÇÃO AJUDANTE - TRANSIÇÃO
  transit : swap => {
    if (document.startViewTransition) { document.startViewTransition(swap); }
    else { swap(); }
  },

  // (B) FUNÇÃO DE SUPORTE - AJAX FETCH
  ajax : (req, data, onload) => {

    // (B1) DADOS DO FORMULÁRIO
    let form = new FormData();
    for (let [k,v] of Object.entries(data)) { form.append(k,v); }

    // (B2) FETCH
    fetch(req + "/", { method:"POST", body:form })
    .then(res => res.text())
    .then(txt => onload(txt))
    .catch(err => console.error(err));
  },

  // (C) CALENDÁRIO DE INICIAÇÃO
  init : () => {
    // (C1) GET HTML ELEMENTOS
    cal.hMth = document.getElementById("calMonth");
    cal.hYear = document.getElementById("calYear");
    cal.hCD = document.getElementById("calDays");
    cal.hCB = document.getElementById("calBody");
    cal.hFormWrap = document.getElementById("calForm");
    cal.hForm = cal.hFormWrap.querySelector("form");
    cal.hfID = document.getElementById("evtID");
    cal.hfStart = document.getElementById("evtStart");
    cal.hfEnd = document.getElementById("evtEnd");
    cal.hfTxt = document.getElementById("evtTxt");
    cal.hfColor = document.getElementById("evtColor");
    cal.hfBG = document.getElementById("evtBG");
    cal.hfDel = document.getElementById("evtDel");

    // (C2) SELETOR DE MÊS E ANO
    let now = new Date(), nowMth = now.getMonth() + 1;
    for (let [i,n] of Object.entries({
      1 : "Janeiro", 2 : "Fevereiro", 3 : "Março", 4 : "Abril",
      5 : "Maio", 6 : "Junho", 7 : "Julho", 8 : "Agosto",
      9 : "Setembro", 10 : "Outubro", 11 : "Novembro", 12 : "Dezembro"
    })) {
      let opt = document.createElement("option");
      opt.value = i;
      opt.innerHTML = n;
      if (i==nowMth) { opt.selected = true; }
      cal.hMth.appendChild(opt);
    }
    cal.hYear.value = parseInt(now.getFullYear());

    // (C3) ANEXAR CONTROLES
    cal.hMth.onchange = cal.load;
    cal.hYear.onchange = cal.load;
    document.getElementById("calToday").onclick = () => cal.today();
    document.getElementById("calBack").onclick = () => cal.pshift();
    document.getElementById("calNext").onclick = () => cal.pshift(1);
    document.getElementById("calAdd").onclick = () => cal.show();
    cal.hForm.onsubmit = () => cal.save();
    document.getElementById("evtCX").onclick = () => cal.transit(() => cal.hFormWrap.close());
    cal.hfDel.onclick = cal.del;

    // (C4) NOMES DOS DIAS
    let days = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    if (cal.mon) { days.push("Domingo"); } else { days.unshift("Domingo"); }
    for (let d of days) {
      let cell = document.createElement("div");
      cell.className = "calCell";
      cell.innerHTML = d;
      cal.hCD.appendChild(cell);
    }

    // (C5) CERREGAR CALENDARIO
    cal.load();
  },

  // (D) MUDAR O PERÍODO ATUAL EM 1 MÊS
  pshift : forward => {
    cal.sMth = parseInt(cal.hMth.value);
    cal.sYear = parseInt(cal.hYear.value);
    if (forward) { cal.sMth++; } else { cal.sMth--; }
    if (cal.sMth > 12) { cal.sMth = 1; cal.sYear++; }
    if (cal.sMth < 1) { cal.sMth = 12; cal.sYear--; }
    cal.hMth.value = cal.sMth;
    cal.hYear.value = cal.sYear;
    cal.load();
  },

  // (E) RETORNA PARA DATA ATUAL
  today : () => {
    let now = new Date(), ny = now.getFullYear(), nm = now.getMonth()+1;
    if (ny!=cal.sYear || (ny==cal.sYear && nm!=cal.sMth)) {
      cal.hMth.value = nm;
      cal.hYear.value = ny;
      cal.load();
    }
  },

  // (F) CARREGAR EVENTOS
  load : () => {

    // (F1) DEFINIR PERÍODO SELECIONADO
    cal.sMth = parseInt(cal.hMth.value);
    cal.sYear = parseInt(cal.hYear.value);
    cal.sDIM = new Date(cal.sYear, cal.sMth, 0).getDate();
    cal.sFD = new Date(cal.sYear, cal.sMth-1, 1).getDay();
    cal.sLD = new Date(cal.sYear, cal.sMth-1, cal.sDIM).getDay();
    let m = cal.sMth;
    if (m < 10) { m = "0" + m; }
    cal.sF = parseInt(String(cal.sYear) + String(m) + "010000");
    cal.sL = parseInt(String(cal.sYear) + String(m) + String(cal.sDIM) + "2359");

    // (F2) AJAX GET EVENTOS
    cal.ajax("get", { month : cal.sMth, year : cal.sYear }, evt => {
      cal.events = JSON.parse(evt);
      cal.draw();
    });
  },

  // (G) DRAW CALENDAR
  draw : () => {
    // (G1) CALCULATE DAY MONTH YEAR
    // observação - janeiro é 0 e dezembro é 11 em js
    // observação - domingo é 0 e sábado é 6 em js
    let now = new Date(), // data atual
        nowMth = now.getMonth()+1, // mês atual
        nowYear = parseInt(now.getFullYear()), // ano atual
        nowDay = cal.sMth==nowMth && cal.sYear==nowYear ? now.getDate() : null ;

    // (G2) DESENHAR LINHAS E CÉLULAS DO CALENDÁRIO
    // (G2-1) INIT + FUNÇÕES AJUDANTES
    let rowA, rowB, rowC, rowMap = {}, rowNum = 1, cell, cellNum = 1,

    // (G2-2) AJUDANTE - MOLDAR UMA NOVA LINHA
    rower = () => {
      rowA = document.createElement("div");
      rowB = document.createElement("div");
      rowC = document.createElement("div");
      rowA.className = "calRow";
      rowA.id = "calRow" + rowNum;
      rowB.className = "calRowHead";
      rowC.className = "calRowBack";
      cal.hCB.appendChild(rowA);
      rowA.appendChild(rowB);
      rowA.appendChild(rowC);
    },

    // (G2-3) AJUDANTE - MOLDAR UMA NOVA CÉLULA
    celler = day => {
      cell = document.createElement("div");
      cell.className = "calCell";
      if (day) {
        cell.innerHTML = day;
        cell.classList.add("calCellDay");
        cell.onclick = () => {
          cal.show();
          let d = +day, m = +cal.hMth.value,
              s = `${cal.hYear.value}-${String(m<10 ? "0"+m : m)}-${String(d<10 ? "0"+d : d)}T00:00:00`;
          cal.hfStart.value = s;
          cal.hfEnd.value = s;
        };
      }
      rowB.appendChild(cell);
      cell = document.createElement("div");
      cell.className = "calCell";
      if (day===undefined) { cell.classList.add("calBlank"); }
      if (day!==undefined && day==nowDay) { cell.classList.add("calToday"); }
      rowC.appendChild(cell);
    };

    // (G2-4) REDEFINIR CALENDÁRIO
    cal.hCB.innerHTML = ""; rower();

    // (G2-5) CÉLULAS EM BRANCO ANTES DO INÍCIO DO MÊS
    if (cal.mon && cal.sFD != 1) {
      let blanks = cal.sFD==0 ? 7 : cal.sFD ;
      for (let i=1; i<blanks; i++) { celler(); cellNum++; }
    }
    if (!cal.mon && cal.sFD != 0) {
      for (let i=0; i<cal.sFD; i++) { celler(); cellNum++; }
    }

    // (G2-6) DIAS DO MÊS
    for (let i=1; i<=cal.sDIM; i++) {
      rowMap[i] = { r : rowNum, c : cellNum };
      celler(i);
      if (cellNum%7==0 && i!=cal.sDIM) { rowNum++; rower(); }
      cellNum++;
    }
    
    // (G2-7) CÉLULAS EM BRANCO APÓS FINAL DO MÊS
    if (cal.mon && cal.sLD != 0) {
      let blanks = cal.sLD==6 ? 1 : 7-cal.sLD;
      for (let i=0; i<blanks; i++) { celler(); cellNum++; }
    }
    if (!cal.mon && cal.sLD != 6) {
      let blanks = cal.sLD==0 ? 6 : 6-cal.sLD;
      for (let i=0; i<blanks; i++) { celler(); cellNum++; }
    }

    // (G3) DESENHAR EVENTOS
    if (Object.keys(cal.events).length > 0) { for (let [id,evt] of Object.entries(cal.events)) {
      // (G3-1) DIA DE INÍCIO E FIM DO EVENTO
      let sd = new Date(evt.s), ed = new Date(evt.e);
      if (sd.getFullYear() < cal.sYear) { sd = 1; }
      else { sd = sd.getMonth()+1 < cal.sMth ? 1 : sd.getDate(); }
      if (ed.getFullYear() > cal.sYear) { ed = cal.sDIM; }
      else { ed = ed.getMonth()+1 > cal.sMth ? cal.sDIM : ed.getDate(); }

      // (G3-2) "MAPA" NO CALENDÁRIO HTML
      cell = {}; rowNum = 0;
      for (let i=sd; i<=ed; i++) {
        if (rowNum!=rowMap[i]["r"]) {
          cell[rowMap[i]["r"]] = { s:rowMap[i]["c"], e:0 };
          rowNum = rowMap[i]["r"];
        }
        if (cell[rowNum]) { cell[rowNum]["e"] = rowMap[i]["c"]; }
      }

      // (G3-3) DESENHAR LINHA DE EVENTO HTML
      for (let [r,c] of Object.entries(cell)) {
        let o = c.s - 1 - ((r-1) * 7), // deslocamento de célula de evento
            w = c.e - c.s + 1; // largura da célula do evento
        rowA = document.getElementById("calRow"+r);
        rowB = document.createElement("div");
        rowB.className = "calRowEvt";
        rowB.innerHTML = cal.events[id]["t"];
        rowB.style.color = cal.events[id]["c"];
        rowB.style.backgroundColor  = cal.events[id]["b"];
        rowB.classList.add("w"+w);
        if (o!=0) { rowB.classList.add("o"+o); }
        rowB.onclick = () => cal.show(id);
        rowA.appendChild(rowB);
      }
    }}
  },

  // (H) MOSTRAR FORMULÁRIO DO EVENTO
  show : id => {
    if (id) {
      cal.hfID.value = id;
      cal.hfStart.value = cal.events[id]["s"];
      cal.hfEnd.value = cal.events[id]["e"];
      cal.hfTxt.value = cal.events[id]["t"];
      cal.hfColor.value = cal.events[id]["c"];
      cal.hfBG.value = cal.events[id]["b"];
      cal.hfDel.style.display = "inline-block";
    } else {
      cal.hForm.reset();
      cal.hfID.value = "";
      cal.hfDel.style.display = "none";
    }
    cal.transit(() => cal.hFormWrap.show());
  },

  // (I) SALVAR EVENTO
  save : () => {
    // (I1) COLETA DE DADOS
    // s & e : data de início e término
    // c & b : texto e cor de fundo
    // t : texto do evento
    var data = {
      s : cal.hfStart.value.replace("T", " "),
      e : cal.hfEnd.value.replace("T", " "),
      t : cal.hfTxt.value,
      c : cal.hfColor.value,
      b : cal.hfBG.value
    };
    if (cal.hfID.value != "") { data.id = parseInt(cal.hfID.value); }

    // (I2) VERIFICAÇÃO DE DATA
    if (new Date(data.s) > new Date(data.e)) {
      alert("A data de início não pode ser posterior à data de término!");
      return false;
    }

    // (I3) SALVAR
    cal.ajax("save", data, res => {
      if (res=="OK") {
        cal.transit(() => cal.hFormWrap.close());
        cal.load();
      } else { alert(res); }
    });
    return false;
  },

  // (J) DELETE EVENT
  del : () => { if (confirm("Deletar Evento?")) {
    cal.ajax("delete", { id : parseInt(cal.hfID.value) }, res => {
      if (res=="OK") {
        cal.transit(() => cal.hFormWrap.close());
        cal.load();
      } else { alert(res); }
    });
  }}
};
window.onload = cal.init;