const QRCode = require('qrcode');
const bananojs = require('bananojs');
const banano = require('./banano.js');

const hcaptcha_site_key = process.env.hcaptchaSiteKey;
const bonus_min_amount = 101;
const qr_code_opts = {
    errorCorrectionLevel: 'H',
    type: 'svg',
    quality: 0.95,
    margin: 1,
    color: {
        dark: '#001919',
        light: '#00FFFF',
    },
}
//If I am on break this is true. Reduces faucet payouts to 0.02
const on_break = false;
//If this is true, logs info
const logging = false;
//If this is true, no unopened accounts can claim
const no_unopened = false;
async function get_faucet_addr() {
    return await bananojs.getBananoAccountFromSeed(process.env.seed, 0);
}
function makeDonateString(banAmount) {
    var str = 'ban:';
    str = str.concat(faucet_addr);
    str = str.concat('?amount=')
    var raw = bananojs.getRawStrFromBananoStr(banAmount);
    str = str.concat(raw);
    return str;
}
async function makeBanAmountQRCode(banAmountStr) {
    let qrStr = await QRCode.toString(makeDonateString(banAmountStr), qr_code_opts);
    let dataURL = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(qrStr);
    return dataURL;
}
async function makeFaucetAddressQRCode() {
    let faucet_addr = await get_faucet_addr();
    let qrStr = await QRCode.toString(faucet_addr, qr_code_opts);
    let dataURL = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(qrStr);
    return dataURL;
}
async function amount_to_give(address) {
    let faucet_addr = await get_faucet_addr();
    let current_bal = await banano.check_bal(faucet_addr);
    let amount = (Math.floor(Math.random() * 7) / 100) + 0.01;
    if (Number(current_bal) > bonus_min_amount) {
        amount = (Math.floor(Math.random() * 8) / 100) + 0.02;
        //Multiplies the reward depending on how much is in the faucet
        let jackpotMultiplier = (Math.floor(current_bal / bonus_min_amount));
        let number2 = (Math.floor(Math.random() * 8) / 100) + 0.02;
        if (number2 == amount) {
          amount = amount * jackpotMultiplier;
        }
    
      }
      if (on_break) {
        amount = 0.02;
      }
      if (await banano.is_unopened(address)) {
        amount = 0.01;
      }

      let today = new Date();
      today = String(today.getMonth() + 1) + "/" + String(today.getDate());
      let halloween = ["10/30", "10/31", "11/1", "11/2"];
      if (halloween.includes(today)) {
        amount = amount * 2;
      }
      return amount;
}
async function check_bal(){
    let address = await get_faucet_addr();
    return await banano.check_bal(address);
}
module.exports = {
    bonus_min_amount: bonus_min_amount,
    qr_code_opts: qr_code_opts,
    on_break: on_break,
    logging: logging,
    no_unopened: no_unopened,
    makeBanAmountQRCode: makeBanAmountQRCode,
    makeFaucetAddressQRCode: makeFaucetAddressQRCode,
    get_faucet_addr: get_faucet_addr,
    amount_to_give: amount_to_give,
    check_bal: check_bal,
    hcaptcha_site_key: hcaptcha_site_key
}