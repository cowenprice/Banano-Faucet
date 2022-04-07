const express = require('express');
const axios = require('axios');
const nunjucks = require('nunjucks');
const favicon = require('serve-favicon');
//const Database = require("@replit/database");

//const db = new Database();

const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const banano = require('./banano.js');
const mongo = require('./database.js');

const faucet = require('./faucet.js');

let db = mongo.getDb();
let collection;
//collection.find({}).forEach(console.dir)
db.then((db) => {
  collection = db.collection("collection");
});


var nun = nunjucks.configure('templates', { autoescape: true });

async function insert(addr, value) {
  await collection.insertOne({ "address": addr, "value": value });
}

async function replace(addr, newvalue) {
  await collection.replaceOne({ "address": addr }, { "address": addr, "value": newvalue });
}

async function find(addr) {
  return await collection.findOne({ "address": addr });
}

async function count(query) {
  return await collection.count(query);
}

const app = express();

app.use(express.static('files'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(favicon(__dirname + '/favicon.ico'));
const claim_freq = 86400000;

let ip_cache = {};
function clearCache() {
  ip_cache = {};
}
setInterval(clearCache, claim_freq * 1.3);

let nano_ip_cache = {};
function nanoclearCache() {
  nano_ip_cache = {};
}
setInterval(nanoclearCache, claim_freq * 1.3);

const invisible_hcaptcha = true;
var invisible_hcaptcha_token = '';

//const faucet_addr_nano = "nano_3jyqzypmcn94dmyp7eb3k85sug1568xwehzx738o5jniaxaf1jpxdakjz96r";

const blacklist = ["ban_3qyp5xjybqr1go8xb1847tr6e1ujjxdrc4fegt1rzhmcmbtntio385n35nju", "ban_1yozd3rq15fq9eazs91edxajz75yndyt5bpds1xspqfjoor9bdc1saqrph1w", "ban_1894qgm8jym5xohwkngsy5czixajk5apxsjowi83pz9g6zrfo1nxo4mmejm9", "ban_38jyaej59qs5x3zim7t4pw5dwixibkjw48tg1t3i9djyhtjf3au7c599bmg3", "ban_3a68aqticd6wup99zncicrbkuaonypzzkfmmn66bxexfmw1ckf3ewo3fmtm9", "ban_3f9j7bw9z71gwjo7bwgpfcmkg7k8w7y3whzc71881yrmpwz9e6c8g4gq4puj", "ban_3rdjcqpm3j88bunqa3ge69nzdzx5a6nqumzc4ei3t1uwg3ciczw75xqxb4ac", "ban_3w5uwibucuxh9psbpi9rp9qnikh9gywjc94cyp5rxirzsr5mtk5gbr5athoc", "ban_1pi3knekobemmas387mbq44f9iq9dzfmuodoyoxbs38eh5yqtjmy1imxop6m", "ban_1awbxp5y7r97hmc1oons5z5nirgyny7jenxcn33ehhzjmotf1pnuoopousur"]

const nano_blacklist = ["nano_1or7xscday8pm91zjfnh5bsmsgo9t1rnci9ekopiuyfcmk3noa9oueo8zoeb", "nano_17ka7phdc5za7be4xmawjhsyoubogmunkc5fkp91sztdiqbcpoiaps984xe1", "nano_1s6aa835kgr6g57zy1nhig9i7p4hkuije1r4k875qtstbari9gxyn3izs6kc", "nano_17qmowxc9h6fkj6bm94b4rqkwwws9knyh6kueadnf4dk7upm5etpogmd5dj8"]


nun.addGlobal('invisible_hcaptcha_token', invisible_hcaptcha_token);

async function setAddrQRCode() {
  let faucet_qr = await faucet.makeFaucetAddressQRCode();
  nun.addGlobal('faucet_qr', faucet_qr);
  return faucet_qr;
}
app.get('/', async function (req, res) {
  let faucet_addr = await faucet.get_faucet_addr();
  await setAddrQRCode();
  let errors = false;
  let address = false;
  let given = false;
  let current_bal = await faucet.check_bal();
  let bonus_mode = current_bal > faucet.bonus_min_amount;
  let amount = 0;
  let jackpotMultiplier = (Math.floor(current_bal / faucet.bonus_min_amount));
 
  //render template 
  return res.send(nunjucks.render('index.html', { errors: errors, address: address, given: given, amount: amount, faucet_addr: faucet_addr, invisible_hcaptcha: invisible_hcaptcha, bonus_mode: bonus_mode, jackpotMultiplier: jackpotMultiplier, hcaptcha_site_key: faucet.hcaptcha_site_key }));
})

app.post('/', async function (req, res) {
  let faucet_addr = await faucet.get_faucet_addr();
  let errors = false;
  let address = req.body['addr'];
  let given = false;
  let current_bal = await faucet.check_bal();
  let amount = await faucet.amount_to_give(address);
  let valid = await banano.is_valid(address);
  if (!valid) {
    errors = "Invalid address"
    return res.send(nunjucks.render("index.html", { errors: errors, address: address, given: given, amount: amount, current_bal: String(current_bal), on_break: faucet.on_break, faucet_addr: faucet_addr, invisible_hcaptcha: invisible_hcaptcha }));
  }

  let token = req.body['h-captcha-response'];
  if (invisible_hcaptcha_token == null || invisible_hcaptcha_token.length > 0) {
    token = invisible_hcaptcha_token;
  }
  let params = new URLSearchParams();
  params.append('response', token);
  params.append('secret', process.env.hcaptchaSecret);
  let captcha_resp = await axios.post('https://hcaptcha.com/siteverify', params)
  captcha_resp = captcha_resp.data;
  let dry = await banano.faucet_dry()

  let account_history = await banano.get_account_history(address);
  if (banano.address_related_to_blacklist(account_history, blacklist) || blacklist.includes(address)) {
    console.log(address)
    errors = "This address is blacklisted because it is cheating and farming faucets (or sent money to an address participating in cheating and farming). If you think this is a mistake message me (u/csquarednz) on reddit. If you are a legitimate user impacted by this, please use a different address or try again."
    return res.send(nunjucks.render("index.html", { errors: errors, address: address, given: given, amount: amount, current_bal: String(current_bal), on_break: faucet.on_break, faucet_addr: faucet_addr, invisible_hcaptcha: invisible_hcaptcha }));
  }

  if (await banano.is_unopened(address) && faucet.no_unopened) {
    errors = "Hello! Currently unopened accounts are not allowed to claim, because the faucet is under attack. We apologize to legitimate users."

    return res.send(nunjucks.render("index.html", { errors: errors, address: address, given: given, amount: amount, current_bal: String(current_bal), on_break: faucet.on_break, faucet_addr: faucet_addr, invisible_hcaptcha: invisible_hcaptcha }));
  }

  if (faucet.logging) {
    console.log(address)
    console.log(req.header('x-forwarded-for'))
  }

  if (dry) {
    errors = "Faucet dry"
    return res.send(nunjucks.render("index.html", { errors: errors, address: address, given: given, amount: amount, current_bal: String(current_bal), on_break: faucet.on_break, faucet_addr: faucet_addr, invisible_hcaptcha: invisible_hcaptcha }));
  }
  if (!captcha_resp['success']) {
    errors = "Captcha failed"
    return res.send(nunjucks.render("index.html", { errors: errors, address: address, given: given, amount: amount, current_bal: String(current_bal), on_break: faucet.on_break, faucet_addr: faucet_addr, invisible_hcaptcha: invisible_hcaptcha }));
  }
  
  // let ip = req.header('x-forwarded-for').slice(0,14);
  // if (ip_cache[ip]) {
  //   ip_cache[ip] = ip_cache[ip]+1
  //   if (ip_cache[ip] > 3) {
  //     errors = "Too many claims from this IP"
  //     return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: faucet.on_break, faucet_addr: faucet_addr, invisible_hcaptcha: invisible_hcaptcha }));
  //   }
  // } else {
  //   ip_cache[ip] = 1
  // }

  if (req.cookies['last_claim']) {
    if (Number(req.cookies['last_claim']) + claim_freq > Date.now()) {
      errors = "Last claim too soon"
      return res.send(nunjucks.render("index.html", { errors: errors, address: address, given: given, amount: amount, current_bal: String(current_bal), on_break: faucet.on_break, faucet_addr: faucet_addr, invisible_hcaptcha: invisible_hcaptcha }));
    }
  }

  //let db_result = await db.get(address);
  let db_result = await find(address);
  if (db_result) {
    db_result = db_result['value'];
    if (Number(db_result) + claim_freq < Date.now()) {
      //all clear, send bananos!
      send = await banano.send_banano(address, amount);
      if (send == false) {
        errors = "Send failed"
      } else {
        res.cookie('last_claim', String(Date.now()));
        //await db.set(address,String(Date.now()));
        await replace(address, String(Date.now()));
        given = true;
      }
    } else {
      errors = "Last claim too soon"
    }
  } else {
    //all clear, send bananos!
    send = await banano.send_banano(address, amount);
    if (send == false) {
      errors = "Send failed"
    } else {
      res.cookie('last_claim', String(Date.now()));
      //await db.set(address,String(Date.now()));
      await insert(address, String(Date.now()));
      given = true;
    }
  }

  return res.send(nunjucks.render("index.html", { errors: errors, address: address, given: given, amount: amount, current_bal: String(current_bal), on_break: faucet.on_break, faucet_addr: faucet_addr, invisible_hcaptcha: invisible_hcaptcha }));
})
app.listen(8082, '0.0.0.0', async () => {
  await banano.receive_deposits();
  //nano receive deposits is expensive, avoid doing
  //await nano.receive_deposits();
  console.log(`App on`)
});
