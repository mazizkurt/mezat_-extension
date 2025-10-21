# 🔨 YouTube Mezat Sistemi

YouTube canlı yayın chatinden mezat kazananlarını otomatik belirler ve yönetir.

## Özellikler

🔥 **MEZAT BAŞLAT** ile anlık fiyat kontrolü
✅ Kazanan sayısı kadar ilk katılımcıları otomatik seçer
✅ Canlı katılımcı listesi (popup içinde)
✅ Kullanıcı adlarına tıklayarak kayıt ekleme (3 tıklama)
✅ Kayıtlı kullanıcılar yeşil, kayıtsızlar kırmızı görünür
✅ CSV dosyaları ile kayıtlı kullanıcıları içe/dışa aktarma
✅ Kazananları Ürün ID ile CSV olarak indirme

## Kurulum

1. Chrome → Extensions → Developer Mode → Load Unpacked
2. Bu klasörü seçin

## Kullanım

### 1. Mezat Sistemi (Ana Özellik)

1. YouTube canlı chat sayfasına gidin
2. Extension'ı açın
3. **Ürün ID** girin (ör: SKU-12345)
4. **Mezat Fiyatı** girin (ör: 250)
5. **Kazanan Sayısı** girin (ör: 10)
6. **"Chat Taramasını Başlat"** butonuna tıklayın
7. Canlı yayında **"⚡ MEZAT BAŞLAT"** butonuna basın
8. O anda chat'te fiyatı yazan ilk N kişi otomatik listelenecek
9. Popup içinde canlı liste görünür (🏆 ile kazananlar işaretli)
10. **"🛑 MEZAT DURDUR"** ile mezatı sonlandırın
11. Kazananlar otomatik kaydedilir

### 2. Kayıtlı Kullanıcı Yönetimi

**Manuel Kayıt:**
- Chat'te kullanıcı isimlerine 3 kez tıklayarak kayıt edin
- Kayıtlı olanlar yeşil, kayıtsızlar kırmızı görünür

### 2. Kayıtlı Kullanıcıları Yönetme

**CSV'ye Kaydetme:**
- "Kayıtlı Kullanıcıları İndir (CSV)" → `registered_users.csv` indirilir

**CSV'den Yükleme:**
- "Kayıtlı Kullanıcıları Yükle (CSV)" → CSV dosyası seç
- Format:
```csv
username
kullanici1
kullanici2
kullanici3
```

**Temizleme:**
- "Kayıtlı Kullanıcıları Temizle" → Tüm kayıtlar silinir

### 3. Kazananları İndirme

- "Kazananları İndir (CSV)" → Fiyatı yazan kullanıcılar CSV olarak indirilir

## CSV Formatları

### Kayıtlı Kullanıcılar (registered_users.csv)
```csv
username
ahmet123
mehmet456
ayse789
```

### Kazananlar (winners.csv)
```csv
username,message,price,timestamp
ahmet123,250 TL ödemeye hazırım,250,2024-01-15T10:30:00.000Z
mehmet456,250,250,2024-01-15T10:31:00.000Z
```

## İpuçları

- Kayıtlı kullanıcı listesini düzenli olarak yedekleyin
- CSV dosyalarını Excel veya Google Sheets'te açabilirsiniz
- Chat başlamadan önce kullanıcıları CSV'den yükleyin
- Her oturum sonunda kazananları indirin

## Teknik Detaylar

- **Storage**: Chrome Local Storage
- **Kayıt**: 3 tıklama ile onay
- **Renk Sistemi**: Yeşil (kayıtlı) / Kırmızı (kayıtsız)
- **Fiyat Algılama**: Regex ile otomatik tespit
