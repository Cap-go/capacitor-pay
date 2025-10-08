import { Pay } from '@capgo/capacitor-pay';

window.testEcho = () => {
    const inputValue = document.getElementById("echoInput").value;
    Pay.echo({ value: inputValue })
}
