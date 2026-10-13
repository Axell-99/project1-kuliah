/* Autentikasi admin (sisi klien).
   Cocok untuk proyek statis/tugas. Untuk sistem produksi, validasi login
   harus dilakukan di server (backend), bukan di JavaScript browser. */
const AUTH_KUNCI = "umktcare_sesi";
const AKUN_ADMIN = { username: "admin", password: "admin123", nama: "Administrator" };

function bacaSesi() {
    for (const penyimpanan of [sessionStorage, localStorage]) {
        try {
            const sesi = JSON.parse(penyimpanan.getItem(AUTH_KUNCI));
            if (sesi && sesi.username === AKUN_ADMIN.username) return sesi;
        } catch (error) { /* abaikan data rusak */ }
    }
    return null;
}

function prosesLogin(username, password, tetapMasuk) {
    if (username.trim().toLowerCase() !== AKUN_ADMIN.username || password !== AKUN_ADMIN.password) {
        return false;
    }
    const sesi = JSON.stringify({ username: AKUN_ADMIN.username, nama: AKUN_ADMIN.nama, waktu: Date.now() });
    try {
        sessionStorage.removeItem(AUTH_KUNCI);
        localStorage.removeItem(AUTH_KUNCI);
        (tetapMasuk ? localStorage : sessionStorage).setItem(AUTH_KUNCI, sesi);
    } catch (error) {
        return false;
    }
    return true;
}

function prosesLogout() {
    try {
        sessionStorage.removeItem(AUTH_KUNCI);
        localStorage.removeItem(AUTH_KUNCI);
    } catch (error) { /* abaikan */ }
    location.replace("login.html");
}

/* Dipanggil di <head> halaman yang dilindungi. */
function wajibLogin() {
    if (!bacaSesi()) {
        document.documentElement.style.visibility = "hidden";
        location.replace("login.html");
    }
}
