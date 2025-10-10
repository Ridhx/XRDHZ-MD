import axios from "axios";
import FormData from "form-data";
import { fileTypeFromBuffer } from "file-type";

/**
 * Upload File to URL (https://qu.ax)
 * Supported mimetypes:
 * - `image/jpeg`
 * - `image/jpg`
 * - `image/png`
 * - `video/mp4`
 * - `others files`
 * @param {Buffer} buffer
 */
export async function uploadFile(buffer) {
    try {
        let { ext, mime } = (await fileTypeFromBuffer(buffer)) || {
            ext: "bin",
            mime: "application/octet-stream"
        };
        const form = new FormData();
        form.append("files[]", buffer, {
            filename: `myfiles.${ext}`,
            contentType: mime
        });
        form.append("expiry", "-1");

        const { data } = await axios.post("https://qu.ax/upload.php", form, {
            headers: {
                ...form.getHeaders()
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });
        return data.files[0].url;
    } catch (error) {
        console.log(error);
    }
}

/**
 * Upload File to URL (https://tmpfiles.org)
 * Supported mimetypes:
 * - `image/jpeg`
 * - `image/jpg`
 * - `image/png`
 * - `video/mp4`
 * - `other files`
 * @param {Buffer} buffer
 */
export async function uploadFile2(buffer) {
    const { ext, mime } = (await fileTypeFromBuffer(buffer)) || {};
    const form = new FormData();
    form.append("file", buffer, { filename: `tmp.${ext}`, contentType: mime });
    try {
        const { data } = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
            headers: form.getHeaders()
        });
        const match = /https?:\/\/tmpfiles.org\/(.*)/.exec(data.data.url);
        return `https://tmpfiles.org/dl/${match[1]}`;
    } catch (error) {
        console.log(error);
    }
}
