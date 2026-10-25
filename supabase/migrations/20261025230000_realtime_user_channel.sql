-- ADR-0008 : canaux Realtime privés. Le canal `user:{uid}` n'est lisible que par son propriétaire.
-- Les messages sont émis côté serveur (triggers / realtime.send), jamais par le client :
-- aucune policy INSERT n'est donc accordée.
create policy realtime_user_channel_select_own
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'user:' || (select auth.uid())::text
  );

comment on policy realtime_user_channel_select_own on realtime.messages is
  'ADR-0008 : réception du canal privé user:{uid} réservée à son propriétaire (aucune émission client).';
