# Tiến Lên

Ứng dụng chơi Tiến Lên trực tuyến nhiều người. Mỗi phòng có tối đa 4 chỗ,
chủ phòng cấu hình luật trước khi tạo phòng, người chơi tham gia qua trình
duyệt và đồng bộ ván qua máy chủ Socket.IO. Luật chi tiết nằm ngay trong ứng
dụng tại đường dẫn `/rules`.

Ứng dụng hỗ trợ từ 2 đến 4 người. Mỗi người chỉ xem được bài của mình. Điểm
cược và kết quả được ghi dưới dạng chip ảo; ứng dụng không nhận hay xử lý tiền
thật.

## Luồng chơi

1. Nhập tên, tạo phòng và chọn luật; hoặc tham gia một phòng đang chờ.
2. Chủ phòng bắt đầu khi đã có ít nhất 2 người. Phòng có tối đa 4 người.
3. Mỗi người được chia 13 lá. Người giữ lá mở đầu đã chọn đi trước và phải
   đánh lá đó trong lượt đầu tiên.
4. Chọn lá để đưa vào khu vực bài chuẩn bị, sau đó đánh bài hoặc bỏ lượt theo
   tình huống. Có thể sắp xếp hoặc đưa bài đã chọn trở lại tay.
5. Khi một ván kết thúc, xem thứ hạng và biến động chip; người chơi có thể bắt
   đầu ván tiếp theo. Điểm được cộng dồn trong cùng trận.

Chủ phòng có quyền bắt đầu hoặc xóa phòng khi phòng còn chờ. Khi ván đã bắt
đầu, quyền chơi như nhau giữa các người chơi. Bài được xáo và chia lại cho
mỗi ván mới; người về nhất ván trước thường được mở ván sau, trừ khi luật
3 đôi thông mở đầu được áp dụng.

## Luật và thiết lập phòng

### Thứ tự và tổ hợp bài

- Giá trị lá tăng dần theo hạng `3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2`.
- Cùng hạng thì chất tăng dần: bích (♠), tép (♣), rô (♦), cơ (♥). Hạng được
  so trước chất.
- Tổ hợp thường gồm: bài lẻ, đôi, ba lá cùng hạng, sảnh từ 3 lá liên tiếp
  (không có lá 2), 3 đôi thông, 4 đôi thông và tứ quý.
- Để chặn, thông thường phải đánh tổ hợp cùng loại và cùng số lá, có lá cao
  nhất lớn hơn. Chặt 2 là ngoại lệ và phụ thuộc các lựa chọn của phòng.
- Người bỏ lượt không đánh lại trong vòng hiện tại, trừ khi một luật cắt vòng
  được bật. Khi chỉ còn một người có thể đánh, người đó được quyền đi tiếp;
  những người khác không thể chặn trong lúc này.

### Các lựa chọn chủ phòng

| Thiết lập | Mặc định | Tác dụng |
|---|---|---|
| Lá mở đầu | 3♠ | Chọn một trong bốn lá 3. Người giữ lá đó đi đầu và phải đánh nó ở lượt đầu ván đầu tiên. |
| Thắng trắng 3♠ | Tắt | Nếu bật, người giữ 3♠ về nhất được tính thắng trắng; phần kết toán theo thứ hạng của ván đó được nhân đôi. |
| 3 đôi thông chặt 2 | Tắt | Cho phép 3 đôi thông chặt một lá 2. |
| 3 đôi thông mở đầu ván sau | Bật | Ở ván kế tiếp, người có bộ 3 đôi thông nhỏ nhất có thể chọn đánh bộ đó để mở đầu thay vì người về nhất ván trước. |
| Tứ quý chặt 1 lá 2 | Bật | Cho phép tứ quý chặt một lá 2. |
| Tứ quý chặt đôi 2 | Tắt | Cho phép tứ quý chặt đôi 2; lựa chọn này cũng cho phép chặt một lá 2. |
| Tứ quý cắt vòng | Tắt | Khi tứ quý chặt 2, mở lại lượt cho những người đã bỏ lượt. |
| 4 đôi thông chặt 1 lá 2 | Tắt | Cho phép 4 đôi thông chặt một lá 2. |
| 4 đôi thông chặt đôi 2 | Bật | Cho phép 4 đôi thông chặt đôi 2; lựa chọn này cũng cho phép chặt một lá 2. |
| 4 đôi thông cắt vòng | Bật | Khi 4 đôi thông chặt 2, mở lại lượt cho những người đã bỏ lượt. |
| Tiền cược cơ sở | 1 | Mỗi người bắt đầu với 100 lần tiền cược cơ sở dưới dạng chip ảo. |
| Cách tính thứ hạng | Nhất ăn những người còn lại | Người về nhất nhận một lần tiền cược từ mỗi người chơi khác. |
| Giá trị từng lá 2 | 2♠: 1x, 2♣: 2x, 2♦: 3x, 2♥: 4x | Hệ số nhân với tiền cược cơ sở khi chặt 2 hoặc còn 2 trên tay lúc kết thúc. |

Ở chế độ tùy chỉnh, chủ phòng đặt hệ số cho hạng 1–4. Các hệ số phải là số
nguyên trong khoảng -1000 đến 1000 và có tổng bằng 0. Với phòng ít hơn 4
người, các hệ số được cân bằng lại cho số người thực tế.

Khi chặt 2, người chặt trả giá trị của lá 2 cho người đang giữ tổ hợp ở giữa;
nếu chặt đôi 2 thì cộng giá trị của cả hai lá. Khi kết thúc ván, các lá 2 còn
trên tay người chơi chưa về nhất được tính là thối và trả tổng giá trị cho
người về nhất. Các khoản này được tính riêng với kết toán thứ hạng.

Thiết lập được máy chủ kiểm tra và giữ cố định trong trận. Chip chỉ là điểm
trong ứng dụng, không phải tiền thật.

## Chạy trên máy cá nhân

Cần cài Node.js và npm. Cài thư viện:

```bash
npm install
```

Chạy máy chủ API, đồng bộ ván và phục vụ bản giao diện đã build:

```bash
npm run build
npm run server
```

Mở [http://localhost:8000](http://localhost:8000). Máy chủ mặc định dùng cổng
`8000`.

Khi phát triển giao diện, chạy máy chủ trong một terminal:

```bash
npm run server
```

và chạy máy chủ phát triển React trong terminal khác:

```bash
npm start
```

Mở [http://localhost:3000](http://localhost:3000). Trong môi trường phát
triển, giao diện kết nối tới máy chủ tại `http://localhost:8000`.

## Lệnh

| Lệnh | Tác dụng |
|---|---|
| `npm start` | Chạy máy chủ phát triển React. |
| `npm run server` | Chạy máy chủ boardgame.io và phục vụ thư mục `build/` nếu đã build. |
| `npm run build` | Tạo bản giao diện production trong `build/`. |
| `npm test` | Chạy bộ kiểm thử Jest. |
| `npm run lint` | Kiểm tra lint và định dạng JavaScript. |
| `npm run format` | Định dạng JavaScript. |

## Triển khai

Ứng dụng được phục vụ bởi một tiến trình Node.js: build giao diện rồi chạy
`node server-loader.cjs` (lệnh tương đương là `npm run server`). `Procfile` đã
có lệnh khởi chạy cho nền tảng hỗ trợ Procfile.

| Biến môi trường | Mục đích |
|---|---|
| `PORT` | Cổng HTTP và Socket.IO; mặc định `8000`. |
| `CORS_ORIGIN` | Danh sách origin bổ sung, phân cách bằng dấu phẩy, khi giao diện và API đặt ở hai host khác nhau. |
| `REACT_APP_SERVER_URL` | URL máy chủ API khác, được đưa vào lúc build giao diện. Mặc định production dùng cùng origin. |

Trạng thái phòng và ván hiện được lưu trong bộ nhớ của tiến trình. Khởi động
lại máy chủ sẽ làm mất các phòng và điểm; chỉ chạy một instance nếu chưa bổ
sung cơ chế lưu trữ/chia sẻ trạng thái. Khi dùng HTTPS, hãy phục vụ API và giao
diện qua HTTPS cùng origin hoặc cấu hình đúng `CORS_ORIGIN` và
`REACT_APP_SERVER_URL`.

## Công nghệ và ghi công

Dự án dùng React, Create React App và boardgame.io. Hình lá bài dựa trên bộ bài
của Adrian Kennard: [me.uk/cards](https://www.me.uk/cards/).
