-- Migration: Đổi faq_categories từ 1 cột name → 4 cột name_vi/jp/en/np
-- Chạy file này nếu đã chạy 001 trước đó

-- Thêm 4 cột mới
alter table faq_categories
  add column if not exists name_vi text,
  add column if not exists name_jp text,
  add column if not exists name_en text,
  add column if not exists name_np text;

-- Copy dữ liệu cũ sang name_vi
update faq_categories set name_vi = name where name_vi is null;

-- Điền tên Nhật + Anh + Nepal theo slug
update faq_categories set
  name_jp = case slug
    when 'attendance'  then '出退勤管理'
    when 'leave'       then '休暇・有給'
    when 'salary'      then '給与・給料'
    when 'insurance'   then '保険・社会保険'
    when 'visa'        then 'ビザ・在留資格'
    when 'housing'     then '住居・寮'
    when 'contact'     then '会社への連絡'
    when 'rules'       then '社内規則'
    when 'discipline'  then '懲戒・処分'
    when 'recruitment' then '採用・入社'
    when 'other'       then 'その他'
    else name
  end,
  name_en = case slug
    when 'attendance'  then 'Attendance'
    when 'leave'       then 'Leave'
    when 'salary'      then 'Salary'
    when 'insurance'   then 'Insurance'
    when 'visa'        then 'Visa'
    when 'housing'     then 'Housing'
    when 'contact'     then 'Company Contact'
    when 'rules'       then 'Company Rules'
    when 'discipline'  then 'Discipline'
    when 'recruitment' then 'Recruitment'
    when 'other'       then 'Other'
    else name
  end,
  name_np = case slug
    when 'attendance'  then 'हाजिरी'
    when 'leave'       then 'बिदा'
    when 'salary'      then 'तलब'
    when 'insurance'   then 'बीमा'
    when 'visa'        then 'भिसा'
    when 'housing'     then 'आवास'
    when 'contact'     then 'कम्पनी सम्पर्क'
    when 'rules'       then 'कम्पनी नियम'
    when 'discipline'  then 'अनुशासन'
    when 'recruitment' then 'भर्ती'
    when 'other'       then 'अन्य'
    else name
  end;

-- Đặt NOT NULL sau khi đã fill dữ liệu
alter table faq_categories
  alter column name_vi set not null,
  alter column name_jp set not null,
  alter column name_en set not null,
  alter column name_np set not null;

-- Thêm cột language vào documents nếu chưa có
alter table documents
  add column if not exists language text default 'vi'
    check (language in ('vi', 'jp', 'en', 'np', 'mixed'));
