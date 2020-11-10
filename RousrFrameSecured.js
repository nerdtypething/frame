// RousrFrameSecured.js

// todo: this is where we will define the credentials after
// they've been decrypted

const crypto = require('crypto');
const fs = require('fs');

class RousrFrameSecured {

    constructor(securedFileName) {
        this._securedFileName = securedFileName;
    }

    getSecureData() {
        return this.decrypt(this._securedFileName);
    }

    decrypt(fileName) {
    
        var encryptedCreds = fs.readFileSync(fileName);
        var encryptedCredsJson = JSON.parse(encryptedCreds);
    
        var decryptObject = {};
    
        for (var envKey in encryptedCredsJson) {
            var encryptedCreds = encryptedCredsJson[envKey];
    
            decryptObject[envKey] = {};
    
            for (var credentialKey in encryptedCreds) {
                var encryptionData = encryptedCreds[credentialKey];
                var encryptedText = Buffer.from(encryptionData.token, 'hex');
                var iv = Buffer.from(encryptionData.iv, 'hex');
                var key = Buffer.from(encryptionData.key, 'hex');
                var decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
                var decryptedText = decipher.update(encryptedText);
                decryptedText = Buffer.concat([decryptedText, decipher.final()]);
                        
                decryptObject[envKey][credentialKey] = decryptedText.toString();
            }
        }
    
        return decryptObject;
    }
}

module.exports = RousrFrameSecured;
