-- 1. 관리자(admin) 권한으로 혹은 Supabase SQL Editor에서 실행하여 공용 게임을 등록합니다.
INSERT INTO public.games (name, default_icon_url, status)
VALUES 
  ('명일방주', '/assets/games/arknights.png', 'APPROVED'),
  ('카오스 제로 나이트메어', '/assets/games/chaos_zero_nightmare.png', 'APPROVED'),
  ('명일방주: 엔드필드', '/assets/games/endfield.png', 'APPROVED'),
  ('원신', '/assets/games/genshin.png', 'APPROVED'),
  ('림버스 컴퍼니', '/assets/games/limbus_company.png', 'APPROVED'),
  ('승리의 여신: 니케', '/assets/games/nikke.png', 'APPROVED'),
  ('붕괴: 스타레일', '/assets/games/star_rail.png', 'APPROVED'),
  ('명조', '/assets/games/wuthering_wave.png', 'APPROVED'),
  ('젠레스 존 제로', '/assets/games/zenless_zone_zero.png', 'APPROVED')
ON CONFLICT (name) DO UPDATE 
SET default_icon_url = EXCLUDED.default_icon_url;

