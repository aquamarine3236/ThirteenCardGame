import React from "react";

export default function Rules() {
  return (
    <main className="rules-page">
      <h1>Luật chơi Tiến Lên</h1>
      <p>
        Mục tiêu của mỗi ván là đánh hết bài trước những người chơi khác. Phòng
        có từ 2 đến 4 người; luật phòng do chủ phòng chọn trước khi tạo và được
        giữ nguyên trong suốt trận.
      </p>

      <h2>Bộ bài và cách so bài</h2>
      <p>
        Dùng bộ bài 52 lá. Thứ tự hạng từ thấp đến cao là 3, 4, 5, 6, 7, 8, 9,
        10, J, Q, K, A, 2. Trong cùng một hạng, chất từ thấp đến cao là bích
        (♠), tép (♣), rô (♦), cơ (♥). So hạng trước rồi mới so chất.
      </p>

      <h2>Chia bài và mở đầu</h2>
      <ul>
        <li>
          Mỗi người chơi được chia 13 lá. Với phòng dưới 4 người, các lá còn
          lại không được chia.
        </li>
        <li>
          Chủ phòng chọn một trong bốn lá 3 làm lá mở đầu; mặc định là 3♠.
          Người giữ lá này đi đầu và phải đánh lá đó trong lượt đầu tiên của
          ván đầu.
        </li>
        <li>
          Ở ván sau, bài được chia lại. Mặc định người về nhất ván trước mở
          đầu. Nếu bật luật 3 đôi thông mở đầu, người có bộ 3 đôi thông nhỏ
          nhất có thể chọn đánh bộ đó để mở ván; nếu từ chối, người về nhất
          trước đó mở đầu.
        </li>
      </ul>

      <h2>Tổ hợp hợp lệ</h2>
      <ul>
        <li>
          <strong>Bài lẻ:</strong> một lá.
        </li>
        <li>
          <strong>Đôi:</strong> hai lá cùng hạng.
        </li>
        <li>
          <strong>Ba lá:</strong> ba lá cùng hạng.
        </li>
        <li>
          <strong>Sảnh:</strong> từ 3 lá có hạng liên tiếp; không được có lá 2.
        </li>
        <li>
          <strong>3 đôi thông:</strong> ba đôi có hạng liên tiếp.
        </li>
        <li>
          <strong>4 đôi thông:</strong> bốn đôi có hạng liên tiếp.
        </li>
        <li>
          <strong>Tứ quý:</strong> bốn lá cùng hạng.
        </li>
      </ul>

      <h2>Đánh bài, chặn và bỏ lượt</h2>
      <p>
        Khi đến lượt, đánh một tổ hợp hợp lệ để bắt đầu lượt đánh hoặc chặn
        tổ hợp ở giữa. Tổ hợp chặn thông thường phải cùng loại, cùng số lá và
        có lá cao nhất lớn hơn tổ hợp trước. Riêng sảnh phải có cùng số lá.
        Các tổ hợp đặc biệt có thể chặt 2 nếu luật phòng cho phép.
      </p>
      <p>
        Nếu không muốn hoặc không thể chặn, người chơi có thể bỏ lượt. Người
        đã bỏ lượt không được đánh tiếp trong vòng đó. Khi chỉ còn một người
        chưa bỏ lượt, người đó được đi tiếp một mình: có thể đánh tổ hợp cao
        hơn hoặc chặt 2 mà không bị người khác chặn. Nếu đánh tổ hợp không
        tiếp tục chặn được tổ hợp giữa, tổ hợp mới mở một vòng cho những người
        còn có thể chơi.
      </p>
      <p>
        Mỗi lượt có 30 giây. Hết giờ mà chưa đánh, người chơi tự động bỏ lượt;
        nếu đang chọn quyền mở bằng 3 đôi thông thì tự động nhường quyền.
      </p>
      <p>
        Tùy thiết lập, tứ quý hoặc 4 đôi thông chặt 2 có thể cắt vòng, cho
        những người đã bỏ lượt cơ hội tham gia lại.
      </p>

      <h2>Chặt và 3 đôi thông mở đầu</h2>
      <ul>
        <li>
          Thứ tự sức mạnh khi chặt là 3 đôi thông, tứ quý, rồi 4 đôi thông.
          Bộ mạnh hơn có thể chặt bộ yếu hơn trong chuỗi.
        </li>
        <li>
          Tùy chọn luật phòng quyết định bộ nào được chặt một lá hoặc đôi 2;
          3 đôi thông chỉ chặt một lá 2.
        </li>
        <li>
          Tứ quý chặt được 2 và 3 đôi thông. 4 đôi thông chặt được 2, 3 đôi
          thông và tứ quý.
        </li>
        <li>
          Tiền phạt được cộng dồn và chỉ chuyển khi chuỗi chặt kết thúc.
          Người bị chặt cuối cùng trả toàn bộ cho người chặt cuối cùng; mỗi
          lần một bộ chặt bị bộ mạnh hơn chặt lại sẽ nhân đôi khoản phạt.
        </li>
        <li>
          Nếu người mở ván bằng 3 đôi thông bị người khác đánh 3 đôi thông cao
          hơn, người mở trả người chặn 4 lần tiền cược cơ sở.
        </li>
      </ul>

      <h2>Kết thúc ván và tính điểm</h2>
      <p>
        Người đánh hết bài được xếp hạng theo thứ tự về. Ván kết thúc khi chỉ
        còn một người chưa hết bài; người đó xếp cuối. Người chưa đánh lá nào
        cũng bị xếp cuối. Sau khi hiện kết quả, người chơi có thể bắt đầu ván
        kế tiếp. Điểm số được cộng dồn trong trận.
      </p>
      <p>
        Ngay sau khi chia, người có tứ quý 2, 6 đôi hoặc đủ sảnh từ 3 đến 2
        thắng trắng: người đó về nhất, những người còn lại đồng hạng bét và
        ván kết thúc. Nếu nhiều người cùng đủ điều kiện, người được quyền đi
        đầu ván được ưu tiên. Trong phòng 4 người, người thắng nhận 3 lần
        mức phạt của hạng bét; ví dụ hạng bét -3 thì người thắng nhận +9. Sau
        thắng trắng, ván kế tiếp bắt đầu từ người giữ lá 3 mở đầu đã chọn. Các
        ván bình thường bắt đầu từ người về nhất. Thắng trắng sau khi chia
        không nhân đôi theo tùy chọn thắng trắng 3♠.
      </p>
      <p>
        Chủ phòng có thể chọn có cho phép đánh lá 2 (kể cả đôi 2) ở nước đi
        làm người chơi hết bài hay không. Mặc định không cho phép; luật này
        không ảnh hưởng đến những lần đánh 2 khác.
      </p>
      <ul>
        <li>
          Mỗi người bắt đầu với 100 lần tiền cược cơ sở dưới dạng chip ảo.
        </li>
        <li>
          Chế độ mặc định: người về nhất nhận một lần tiền cược cơ sở từ mỗi
          người còn lại; mỗi người khác mất một lần tiền cược cơ sở.
        </li>
        <li>
          Chế độ tùy chỉnh: áp dụng hệ số cho từng thứ hạng. Tổng hệ số phải
          bằng 0; nếu có ít hơn 4 người, hệ số được cân bằng theo số người
          thực chơi.
        </li>
        <li>
          Chặt 2 tính tổng giá trị các lá 2 trong chuỗi; khoản phạt được
          chuyển một lần khi chuỗi chặt kết thúc.
        </li>
        <li>
          Khi bật luật thối 2 (mặc định), mỗi lá 2 còn trên tay người về bét
          hoặc cháy bài bị phạt riêng và trả cho người về nhất. Mỗi lá 2 có hệ
          số riêng; mặc định 2♠ = 1x, 2♣ = 2x, 2♦ = 3x, 2♥ = 4x tiền cược cơ
          sở.
        </li>
        <li>
          Có thể bật thắng trắng: người về nhất phải đánh riêng lá 3♠ làm lá
          cuối cùng để hết bài; phần kết toán thứ hạng của ván được nhân đôi.
          Đánh 3♠ trong một tổ hợp nhiều lá không tính là thắng trắng. Khoản
          chặt và thối 2 vẫn tính riêng.
        </li>
      </ul>
      <p>
        Tất cả kết quả chỉ là chip và điểm trong ứng dụng, không có giao dịch
        tiền thật.
      </p>
    </main>
  );
}
