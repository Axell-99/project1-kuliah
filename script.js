const BIAYA_PENDAFTARAN = 20000;
const BIAYA_PEMERIKSAAN = 50000;
const BIAYA_OBAT = 25000;
const KUNCI_DATA = "dataPasienRS";

const KODE_POLI = {
    "Poli Umum": "PU-001",
    "Poli Gigi": "PG-002",
    "Poli Anak": "PA-003",
    "Poli Penyakit Dalam": "PPD-004",
    "Poli Mata": "PM-005",
    "Poli Saraf": "PS-006"
};

const PREFIX_ANTREAN = {
    "Poli Umum": "PU",
    "Poli Gigi": "PG",
    "Poli Anak": "PA",
    "Poli Penyakit Dalam": "PPD",
    "Poli Mata": "PM",
    "Poli Saraf": "PS"
};

function bacaDataTersimpan() {
    // Kunci ini sama dengan versi awal proyek, sehingga data lama dapat dibaca.
    for (const key of [KUNCI_DATA, "dataPasien", "pasienRS", "pasien"]) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (error) {
            console.warn("Data pada kunci", key, "tidak dapat dibaca:", error);
        }
    }
    return [];
}

function buatKodeAntrean(poli, urutan) {
    const prefix = PREFIX_ANTREAN[poli] || "KL";
    return `${prefix}-${String(urutan).padStart(3, "0")}`;
}

function kodeAntreanLama(p) {
    if (p.kodeAntrean) return p.kodeAntrean;
    return buatKodeAntrean(p.poli, Number(p.nomor) || 1);
}

let pasien = bacaDataTersimpan().map((p, index) => {
    const poli = p.poli || "Poli Umum";
    const nomor = Number(p.nomor) || index + 1;
    return {
        ...p,
        nomor,
        nama: String(p.nama || ""),
        nik: String(p.nik || ""),
        poli,
        kodePoli: p.kodePoli || KODE_POLI[poli] || "POLI-000",
        kodeAntrean: p.kodeAntrean || buatKodeAntrean(poli, nomor),
        keluhan: String(p.keluhan || ""),
        diagnosis: String(p.diagnosis || ""),
        tindakan: String(p.tindakan || ""),
        obat: String(p.obat || ""),
        biayaPendaftaran: Number(p.biayaPendaftaran ?? BIAYA_PENDAFTARAN),
        biayaPemeriksaan: Number(p.biayaPemeriksaan ?? (p.diagnosis ? BIAYA_PEMERIKSAAN : 0)),
        biayaObat: Number(p.biayaObat ?? (p.diagnosis ? BIAYA_OBAT : 0)),
        total: Number(p.total ?? (BIAYA_PENDAFTARAN + (p.diagnosis ? BIAYA_PEMERIKSAAN + BIAYA_OBAT : 0))),
        tanggal: p.tanggal || new Date().toLocaleString("id-ID")
    };
});

function simpanData() {
    try {
        localStorage.setItem(KUNCI_DATA, JSON.stringify(pasien));
        return true;
    } catch (error) {
        console.error("Gagal menyimpan data:", error);
        toast("Data gagal disimpan. Pastikan penyimpanan browser diaktifkan.");
        return false;
    }
}
simpanData();

function rupiah(angka) {
    return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

function aman(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
}

function ambilKodePoli(poli) {
    return KODE_POLI[poli] || "POLI-000";
}

function nomorAntreanBerikutnya(poli) {
    const max = pasien.reduce((result, p) => {
        if (p.poli !== poli) return result;
        const match = String(p.kodeAntrean || "").match(/-(\d+)$/);
        const sequence = match ? Number(match[1]) : Number(p.nomor) || 0;
        return Math.max(result, sequence);
    }, 0);
    return buatKodeAntrean(poli, max + 1);
}

function statusPasien(p) {
    return p.diagnosis ? "Sudah diperiksa" : "Menunggu";
}

function perbaruiDashboard() {
    document.getElementById("jumlahPasien").textContent = pasien.length;
    document.getElementById("jumlahPeriksa").textContent = pasien.filter(p => p.diagnosis).length;
    document.getElementById("jumlahMenunggu").textContent = pasien.filter(p => !p.diagnosis).length;
    tampilkanAntreanPoli();
    const info = document.getElementById("infoSimpan");
    if (info) info.textContent = `Tersimpan otomatis di browser ini · ${pasien.length} pasien`;
}

function tampilkanAntreanPoli() {
    const area = document.getElementById("antreanPoli");
    const hitung = Object.keys(KODE_POLI).map(nama => {
        const daftar = pasien.filter(p => p.poli === nama);
        return { nama, kode: KODE_POLI[nama], total: daftar.length, menunggu: daftar.filter(p => !p.diagnosis).length };
    });
    const terbanyak = Math.max(1, ...hitung.map(h => h.total));
    area.innerHTML = hitung.map(h => `
        <div class="baris-poli">
            <div><b>${aman(h.nama)}</b><small>${aman(h.kode)} · ${h.menunggu} menunggu</small></div>
            <div class="batang"><i style="width:${(h.total / terbanyak) * 100}%"></i></div>
            <em>${h.total} pasien</em>
        </div>`).join("");
}

function bukaHalaman(id, tombol) {
    document.querySelectorAll(".halaman").forEach(el => el.classList.remove("aktif"));
    const page = document.getElementById(id);
    if (!page) return;
    page.classList.add("aktif");
    document.querySelectorAll(".nav-button").forEach(btn => btn.classList.remove("aktif-nav"));
    if (tombol) {
        tombol.classList.add("aktif-nav");
        document.getElementById("judulHalaman").textContent = tombol.dataset.judul || tombol.textContent.trim();
    }
    tutupSidebar();
    window.scrollTo({ top: 0 });

    if (id === "dashboard") perbaruiDashboard();
    if (id === "pemeriksaan") isiPilihanPasien("pilihPasien");
    if (id === "pembayaran") isiPilihanPasien("pilihPembayaran");
    if (id === "pasien") tampilkanPasien();
}

document.getElementById("poli").addEventListener("change", function () {
    document.getElementById("infoKodePoli").textContent = this.value
        ? `Kode poli: ${ambilKodePoli(this.value)}`
        : "Kode poli akan tampil setelah poli dipilih.";
});

document.getElementById("formPendaftaran").addEventListener("submit", function (e) {
    e.preventDefault();
    const nama = document.getElementById("nama").value.trim();
    const nik = document.getElementById("nik").value.trim();
    const poli = document.getElementById("poli").value;
    const keluhan = document.getElementById("keluhan").value.trim();

    if (!nama || !poli || !keluhan) return toast("Lengkapi semua data pendaftaran.");
    if (!/^\d{16}$/.test(nik)) return toast("NIK harus terdiri dari 16 digit angka.");
    if (pasien.some(p => p.nik === nik)) return toast("NIK tersebut sudah terdaftar.");

    const nomor = pasien.reduce((max, p) => Math.max(max, Number(p.nomor) || 0), 0) + 1;
    const dataBaru = {
        nomor,
        kodeAntrean: nomorAntreanBerikutnya(poli),
        nama, nik, poli,
        kodePoli: ambilKodePoli(poli),
        keluhan,
        diagnosis: "", tindakan: "", obat: "",
        biayaPendaftaran: BIAYA_PENDAFTARAN,
        biayaPemeriksaan: 0,
        biayaObat: 0,
        total: BIAYA_PENDAFTARAN,
        tanggal: new Date().toLocaleString("id-ID")
    };

    pasien.push(dataBaru);
    if (!simpanData()) {
        pasien = pasien.filter(p => p.nik !== nik);
        return;
    }

    this.reset();
    document.getElementById("infoKodePoli").textContent = "Kode poli akan tampil setelah poli dipilih.";
    document.getElementById("hasilPendaftaran").innerHTML = `
        <div class="sukses">
            <strong>✓ Pendaftaran berhasil!</strong><br>
            Nomor antrean: <strong>${aman(dataBaru.kodeAntrean)}</strong><br>
            Nama: ${aman(nama)}<br>
            Poli: ${aman(poli)} (${aman(dataBaru.kodePoli)})<br>
            Biaya pendaftaran: ${rupiah(BIAYA_PENDAFTARAN)}
        </div>`;
    perbaruiDashboard();
    tampilkanPasien();
    isiPilihanPasien("pilihPasien");
    isiPilihanPasien("pilihPembayaran");
});

function isiPilihanPasien(id) {
    const select = document.getElementById(id);
    const selectedNumber = select.value !== "" && pasien[Number(select.value)]
        ? pasien[Number(select.value)].nomor : null;
    select.innerHTML = '<option value="">Pilih pasien</option>';

    pasien.forEach((p, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = `${kodeAntreanLama(p)} - ${p.nama} (${statusPasien(p)})`;
        select.appendChild(option);
    });

    if (selectedNumber !== null) {
        const idx = pasien.findIndex(p => p.nomor === selectedNumber);
        if (idx >= 0) select.value = String(idx);
    }
    if (id === "pilihPasien") tampilkanInfoPemeriksaan();
    if (id === "pilihPembayaran") tampilkanNota();
}

document.getElementById("pilihPasien").addEventListener("change", tampilkanInfoPemeriksaan);

function tampilkanInfoPemeriksaan() {
    const value = document.getElementById("pilihPasien").value;
    const info = document.getElementById("infoPasien");
    if (value === "") {
        info.innerHTML = "";
        document.getElementById("diagnosis").value = "";
        document.getElementById("tindakan").value = "";
        document.getElementById("obat").value = "";
        document.getElementById("biayaObatInput").value = BIAYA_OBAT;
        return;
    }
    const p = pasien[Number(value)];
    if (!p) return;
    info.innerHTML = `<strong>Antrean ${aman(kodeAntreanLama(p))} - ${aman(p.nama)}</strong><br>
        NIK: ${aman(p.nik)}<br>Poli: ${aman(p.poli)} (${aman(p.kodePoli)})<br>
        Keluhan: ${aman(p.keluhan)}`;
    document.getElementById("diagnosis").value = p.diagnosis;
    document.getElementById("tindakan").value = p.tindakan;
    document.getElementById("obat").value = p.obat;
    document.getElementById("biayaObatInput").value = Number(p.biayaObat ?? BIAYA_OBAT);
}

document.getElementById("formPemeriksaan").addEventListener("submit", function (e) {
    e.preventDefault();
    const value = document.getElementById("pilihPasien").value;
    if (value === "") return toast("Silakan pilih pasien.");
    const p = pasien[Number(value)];
    if (!p) return toast("Data pasien tidak ditemukan.");

    const diagnosis = document.getElementById("diagnosis").value.trim();
    const tindakan = document.getElementById("tindakan").value.trim();
    const obat = document.getElementById("obat").value.trim();
    const biayaObat = Number(document.getElementById("biayaObatInput").value);

    if (!diagnosis || !tindakan || !obat) return toast("Lengkapi diagnosis, tindakan, dan obat.");
    if (!Number.isFinite(biayaObat) || biayaObat < 0) {
        return toast("Tarif obat harus berupa angka nol atau lebih.");
    }

    p.diagnosis = diagnosis;
    p.tindakan = tindakan;
    p.obat = obat;
    p.biayaPemeriksaan = BIAYA_PEMERIKSAAN;
    p.biayaObat = biayaObat;
    p.total = p.biayaPendaftaran + p.biayaPemeriksaan + p.biayaObat;
    if (!simpanData()) return;

    perbaruiDashboard();
    isiPilihanPasien("pilihPasien");
    isiPilihanPasien("pilihPembayaran");
    document.getElementById("pilihPasien").value = String(pasien.findIndex(x => x.nomor === p.nomor));
    tampilkanInfoPemeriksaan();
    tampilkanPasien();
    toast("Pemeriksaan berhasil disimpan!");
});

document.getElementById("pilihPembayaran").addEventListener("change", tampilkanNota);

function tampilkanNota() {
    const value = document.getElementById("pilihPembayaran").value;
    const area = document.getElementById("nota");
    if (value === "") { area.innerHTML = ""; return; }
    const p = pasien[Number(value)];
    if (!p) { area.innerHTML = ""; return; }
    if (!p.diagnosis) {
        area.innerHTML = '<div class="peringatan">Pasien belum diperiksa dokter. Lengkapi pemeriksaan sebelum mencetak nota akhir.</div>';
        return;
    }

    area.innerHTML = `
        <div class="nota-box">
            <div class="nota-header"><h2>✚ KLINIK UMKT CARE</h2><strong>NOTA PEMBAYARAN PASIEN</strong><p>${aman(p.tanggal)}</p></div>
            <div class="nota-baris"><span>Nomor Antrean</span><strong>${aman(kodeAntreanLama(p))}</strong></div>
            <div class="nota-baris"><span>Nama</span><strong>${aman(p.nama)}</strong></div>
            <div class="nota-baris"><span>NIK</span><strong>${aman(p.nik)}</strong></div>
            <div class="nota-baris"><span>Poli</span><strong>${aman(p.poli)} (${aman(p.kodePoli)})</strong></div>
            <div class="nota-baris"><span>Keluhan</span><strong>${aman(p.keluhan)}</strong></div>
            <h3>Hasil Pemeriksaan</h3>
            <div class="nota-baris"><span>Diagnosis</span><strong>${aman(p.diagnosis)}</strong></div>
            <div class="nota-baris"><span>Tindakan</span><strong>${aman(p.tindakan)}</strong></div>
            <div class="nota-baris"><span>Obat</span><strong>${aman(p.obat)}</strong></div>
            <h3>Rincian Biaya</h3>
            <div class="nota-baris"><span>Pendaftaran</span><strong>${rupiah(p.biayaPendaftaran)}</strong></div>
            <div class="nota-baris"><span>Pemeriksaan</span><strong>${rupiah(p.biayaPemeriksaan)}</strong></div>
            <div class="nota-baris"><span>Obat</span><strong>${rupiah(p.biayaObat)}</strong></div>
            <div class="nota-baris nota-total"><span>TOTAL</span><strong>${rupiah(p.total)}</strong></div>
            <p class="ucapan-nota">Terima kasih atas kunjungan Anda.<br>Semoga lekas sehat kembali.</p>
            <button type="button" class="tombol utama tombol-cetak" onclick="window.print()">Cetak Nota</button>
        </div>`;
}

function tampilkanPasien() {
    const kata = document.getElementById("pencarian").value.trim().toLowerCase();
    const hasil = pasien.filter(p => [
        p.nama, p.nik, p.poli, p.kodePoli, kodeAntreanLama(p), String(p.nomor)
    ].some(v => String(v ?? "").toLowerCase().includes(kata)));
    const tbody = document.getElementById("tabelPasien");

    if (!hasil.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="kosong">${pasien.length ? "Data pasien tidak ditemukan." : "Belum ada data pasien. Silakan daftarkan pasien terlebih dahulu."}</td></tr>`;
        return;
    }
    tbody.innerHTML = hasil.map(p => `
        <tr>
            <td class="antrean" data-label="Antrean">${aman(kodeAntreanLama(p))}</td>
            <td data-label="Pasien"><strong>${aman(p.nama)}</strong><small>${aman(p.nik)}</small></td>
            <td data-label="Kode poli"><span class="kode-poli">${aman(p.kodePoli)}</span></td>
            <td data-label="Poli">${aman(p.poli)}</td>
            <td data-label="Status"><span class="status ${p.diagnosis ? "selesai" : "menunggu"}">${statusPasien(p)}</span></td>
            <td data-label="Total">${rupiah(p.total)}</td>
            <td data-label="Aksi"><button type="button" class="tombol-hapus" onclick="hapusPasien(${Number(p.nomor)})">Hapus</button></td>
        </tr>`).join("");
}

function hapusPasien(nomor) {
    const data = pasien.find(p => Number(p.nomor) === Number(nomor));
    if (!data) return toast("Data pasien tidak ditemukan.");
    if (!confirm(`Hapus data pasien ${data.nama} (${kodeAntreanLama(data)})?\n\nData akan dihapus dari browser ini.`)) return;

    const sebelumnya = pasien;
    pasien = pasien.filter(p => Number(p.nomor) !== Number(nomor));
    if (!simpanData()) { pasien = sebelumnya; return; }
    perbaruiDashboard();
    tampilkanPasien();
    isiPilihanPasien("pilihPasien");
    isiPilihanPasien("pilihPembayaran");
    toast("Data pasien berhasil dihapus.");
}

document.getElementById("pencarian").addEventListener("input", tampilkanPasien);
perbaruiDashboard();
tampilkanPasien();
isiPilihanPasien("pilihPasien");
isiPilihanPasien("pilihPembayaran");


/* ===== Notifikasi (toast) ===== */
function toast(pesan, tipe) {
    const jenis = tipe || (/gagal|harus|lengkapi|sudah terdaftar|tidak ditemukan|silakan pilih/i.test(pesan) ? "error" : "sukses");
    const el = document.createElement("div");
    el.className = "toast" + (jenis === "error" ? " error" : "");
    el.setAttribute("role", jenis === "error" ? "alert" : "status");
    el.textContent = pesan;
    document.getElementById("toastArea").appendChild(el);
    setTimeout(() => el.remove(), 3800);
}

/* ===== Sidebar (mobile) ===== */
function tutupSidebar() {
    document.getElementById("sidebar").classList.remove("terbuka");
    document.getElementById("overlay").classList.remove("tampil");
    document.getElementById("tombolMenu").setAttribute("aria-expanded", "false");
}
document.getElementById("tombolMenu").addEventListener("click", () => {
    const terbuka = document.getElementById("sidebar").classList.toggle("terbuka");
    document.getElementById("overlay").classList.toggle("tampil", terbuka);
    document.getElementById("tombolMenu").setAttribute("aria-expanded", String(terbuka));
});
document.getElementById("overlay").addEventListener("click", tutupSidebar);
document.addEventListener("keydown", e => { if (e.key === "Escape") tutupSidebar(); });

/* ===== Sesi admin & logout ===== */
(function mulaiSesi() {
    const sesi = bacaSesi();
    const nama = sesi ? sesi.nama : "Administrator";
    document.getElementById("namaAdmin").textContent = nama;
    document.getElementById("avatarAdmin").textContent = nama.charAt(0).toUpperCase();

    const sekarang = new Date();
    const jam = sekarang.getHours();
    const salam = jam < 11 ? "pagi" : jam < 15 ? "siang" : jam < 18 ? "sore" : "malam";
    document.getElementById("sapaan").textContent = `Selamat ${salam}, ${nama}`;
    document.getElementById("tanggalHariIni").textContent = sekarang.toLocaleDateString("id-ID", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    document.getElementById("tarifDaftar").textContent = rupiah(BIAYA_PENDAFTARAN);
    document.getElementById("tarifPeriksa").textContent = rupiah(BIAYA_PEMERIKSAAN);
    document.getElementById("tarifObat").textContent = rupiah(BIAYA_OBAT);
})();

const dialogKeluar = document.getElementById("dialogKeluar");
document.getElementById("tombolKeluar").addEventListener("click", () => dialogKeluar.showModal());
document.getElementById("batalKeluar").addEventListener("click", () => dialogKeluar.close());
document.getElementById("yakinKeluar").addEventListener("click", prosesLogout);
dialogKeluar.addEventListener("click", e => { if (e.target === dialogKeluar) dialogKeluar.close(); });


/* ===== Cadangan data (unduh & pulihkan) ===== */
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

document.getElementById("tombolEkspor").addEventListener("click", () => {
    if (!pasien.length) return toast("Belum ada data pasien untuk dicadangkan.", "error");
    const isi = JSON.stringify({ aplikasi: "KLINIK UMKT CARE", diekspor: new Date().toISOString(), pasien }, null, 2);
    const url = URL.createObjectURL(new Blob([isi], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cadangan-pasien-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Cadangan data berhasil diunduh.");
});

document.getElementById("tombolImpor").addEventListener("click", () => document.getElementById("fileImpor").click());

document.getElementById("fileImpor").addEventListener("change", function () {
    const berkas = this.files[0];
    this.value = "";
    if (!berkas) return;
    const pembaca = new FileReader();
    pembaca.onerror = () => toast("Berkas gagal dibaca.", "error");
    pembaca.onload = () => {
        let daftar;
        try {
            const data = JSON.parse(pembaca.result);
            daftar = Array.isArray(data) ? data : data.pasien;
        } catch (error) { daftar = null; }
        if (!Array.isArray(daftar) || !daftar.every(p => p && p.nama && p.nik)) {
            return toast("Berkas cadangan tidak valid.", "error");
        }
        const nikAda = new Set(pasien.map(p => p.nik));
        const baru = daftar.filter(p => !nikAda.has(String(p.nik)));
        if (!baru.length) return toast("Tidak ada data baru. Semua NIK sudah terdaftar.", "error");
        if (!confirm(`Pulihkan ${baru.length} data pasien dari cadangan?\n\nData dengan NIK yang sudah ada akan dilewati.`)) return;

        const kosong = pasien.length === 0;
        for (const p of baru) {
            if (kosong) { pasien.push(p); continue; }
            const nomor = pasien.reduce((max, x) => Math.max(max, Number(x.nomor) || 0), 0) + 1;
            pasien.push({ ...p, nomor, kodeAntrean: nomorAntreanBerikutnya(p.poli || "Poli Umum") });
        }
        if (!simpanData()) return;
        location.reload();
    };
    pembaca.readAsText(berkas);
});
