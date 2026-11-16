const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('Generating local 2048-bit RSA key pair for Android keystore...');

// Generate 2048-bit RSA key pair
const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });

console.log('Creating X.509 self-signed certificate (valid for 25 years)...');
const cert = forge.pki.createCertificate();
cert.publicKey = keypair.publicKey;
cert.serialNumber = '01' + crypto.randomBytes(16).toString('hex');
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 25); // 25 years validity for Android

const attrs = [
  { name: 'commonName', value: 'Smart Campus AI' },
  { name: 'organizationName', value: 'Smart Campus University' },
  { name: 'organizationalUnitName', value: 'Mobile Engineering' },
  { name: 'countryName', value: 'IN' },
  { name: 'stateOrProvinceName', value: 'Karnataka' },
  { name: 'localityName', value: 'Bangalore' }
];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Self-sign certificate with SHA-256
cert.sign(keypair.privateKey, forge.md.sha256.create());

console.log('Packaging into PKCS#12 / Android Keystore format...');
const keyAlias = 'smartcampus-key';
// Generate a strong, secure random password
const keystorePassword = crypto.randomBytes(16).toString('hex');
const keyPassword = keystorePassword;

const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
  keypair.privateKey,
  [cert],
  keystorePassword,
  {
    algorithm: '3des', // Android standard compatible PKCS12 encryption
    friendlyName: keyAlias,
    generateLocalKeyId: true
  }
);

const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
const p12Buffer = Buffer.from(p12Der, 'binary');

// Ensure directory exists
const keystoresDir = path.join(__dirname, '..', 'keystores');
if (!fs.existsSync(keystoresDir)) {
  fs.mkdirSync(keystoresDir, { recursive: true });
}

const keystorePath = path.join(keystoresDir, 'release.keystore');
fs.writeFileSync(keystorePath, p12Buffer);
console.log(`✅ Keystore successfully written locally to: ${keystorePath} (${p12Buffer.length} bytes)`);

// Write credentials.json at project root
const credentialsJson = {
  android: {
    keystore: {
      keystorePath: 'keystores/release.keystore',
      keystorePassword: keystorePassword,
      keyAlias: keyAlias,
      keyPassword: keyPassword
    }
  }
};

const credentialsPath = path.join(__dirname, '..', 'credentials.json');
fs.writeFileSync(credentialsPath, JSON.stringify(credentialsJson, null, 2));
console.log(`✅ Local credentials configuration written to: ${credentialsPath}`);

console.log('\n--- KEYSTORE DETAILS (STORED LOCALLY) ---');
console.log('File: keystores/release.keystore');
console.log('Key Alias:', keyAlias);
console.log('Keystore Password:', keystorePassword);
console.log('Validity: 25 Years (Self-signed RSA 2048-bit with SHA-256)');
