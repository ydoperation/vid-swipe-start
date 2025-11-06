-- Fix message and conversation deletion policies
-- Users should be able to delete their own messages and conversations

-- Drop the blocking deletion policies
DROP POLICY IF EXISTS "Prevent message deletion" ON messages;
DROP POLICY IF EXISTS "Prevent conversation deletion" ON conversations;

-- Allow users to delete their own sent messages
CREATE POLICY "Users can delete their sent messages" ON messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Allow users to delete conversations they're part of
CREATE POLICY "Users can delete their conversations" ON conversations
FOR DELETE
USING (
  auth.uid() = participant1_id OR 
  auth.uid() = participant2_id
);