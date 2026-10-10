
const Utils = {
    encrypt(text) {
        return CryptoJS.AES.encrypt(
            text,
            CONFIG.SECRET_KEY
        ).toString();
    },

    decrypt(cipherText) {
        const bytes = CryptoJS.AES.decrypt(
            cipherText,
            CONFIG.SECRET_KEY
        );
        return bytes.toString(CryptoJS.enc.Utf8);
    },

    saveRecord(key, value) {
        try {
            const encryptedValue = this.encrypt(
                JSON.stringify(value)
            );

            const record = {
                value: encryptedValue,
                expiry: Date.now() + CONFIG.STORAGE_EXPIRY
            };

            localStorage.setItem(
                key,
                JSON.stringify(record)
            );
        } catch (error) {
            console.error('Save error:', error);
        }
    },

    getRecord(key) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            const { value, expiry } = JSON.parse(item);

            if (Date.now() > expiry) {
                localStorage.removeItem(key);
                return null;
            }

            const decrypted = this.decrypt(value);

            return decrypted
                ? JSON.parse(decrypted)
                : null;
        } catch (error) {
            console.error('Read record error:', error);
            return null;
        }
    },

    async getUserIp() {
        const apis = [
            'https://api.ipify.org?format=json',
            'https://api64.ipify.org?format=json'
        ];

        for (const url of apis) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    cache: 'no-store'
                });

                if (!response.ok) {
                    throw new Error(
                        `IP API error: ${response.status}`
                    );
                }

                const data = await response.json();
                const ip = data.ip;

                // Kiểm tra IPv4
                const isIPv4 =
                    typeof ip === 'string' &&
                    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
                    ip.split('.').every(
                        part => Number(part) <= 255
                    );

                // Kiểm tra IPv6 ở mức định dạng cơ bản
                const isIPv6 =
                    typeof ip === 'string' &&
                    ip.includes(':') &&
                    /^[0-9a-fA-F:]+$/.test(ip);

                if (isIPv4 || isIPv6) {
                    return ip;
                }

                throw new Error('Invalid IP response');
            } catch (error) {
                console.error(
                    `IP API failed (${url}):`,
                    error
                );
            }
        }

        return 'N/A';
    },

    async getUserLocation() {
        try {
            const response = await fetch(
                'https://ipwho.is/',
                {
                    method: 'GET',
                    cache: 'no-store'
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Location API error: ${response.status}`
                );
            }

            const data = await response.json();

            if (
                data.success === false ||
                !data.ip
            ) {
                throw new Error(
                    data.message || 'Location lookup failed'
                );
            }

            const parts = [
                data.city,
                data.region,
                data.country
            ].filter(Boolean);

            return {
                ip: data.ip,
                location: parts.length
                    ? parts.join(' | ')
                    : 'N/A',
                country_code: data.country_code || 'N/A',
                region: data.region || 'N/A',
                country: data.country || 'N/A'
            };
        } catch (error) {
            console.error('Location error:', error);

            return {
                ip: await this.getUserIp(),
                location: 'N/A',
                country_code: 'N/A',
                region: 'N/A',
                country: 'N/A'
            };
        }
    },

    async checkIp() {
        const result = await this.getUserLocation();

        console.log('IP:', result.ip);
        console.log('Location:', result.location);

        return result;
    },

    maskPhone(phone) {
        if (!phone || phone.length < 5) {
            return phone;
        }

        const start = phone.slice(0, 2);
        const end = phone.slice(-2);

        return `${start} ${'*'.repeat(
            phone.length - 4
        )} ${end}`;
    },

    maskEmail(email) {
        if (!email) return '';

        return email.replace(
            /^(.)(.*?)(.)@(.+)$/,
            (_, a, mid, c, domain) => {
                return `${a}${'*'.repeat(
                    mid.length
                )}${c}@${domain}`;
            }
        );
    },

    generateTicketId() {
        const gen = () =>
            Math.random()
                .toString(36)
                .substring(2, 6)
                .toUpperCase();

        return `${gen()}-${gen()}-${gen()}`;
    }
};