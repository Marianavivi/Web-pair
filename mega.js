const mega = require("megajs");

const auth = {
    email: 'EnterYourMegaEmail',
    password: 'EnterYourMegaPassword',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
};

/**
 * Uploads a file to MEGA storage.
 * @param {ReadableStream} data - The data stream of the file to upload.
 * @param {string} name - The name of the file to upload.
 * @returns {Promise<string>} - The URL of the uploaded file.
 * @throws Will throw an error if the upload fails.
 */
const upload = (data, name) => {
    return new Promise((resolve, reject) => {
        try {
            const storage = new mega.Storage(auth, () => {
                const uploadStream = storage.upload({ name: name, allowUploadBuffering: true });
                
                // Pipe the data stream to the upload stream
                data.pipe(uploadStream);

                // Listen for the 'add' event which signals that the file has been added
                storage.on("add", (file) => {
                    // Get the download link for the uploaded file
                    file.link((err, url) => {
                        if (err) {
                            reject(err);
                        } else {
                            storage.close();
                            resolve(url);
                        }
                    });
                });
            });
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = { upload };
