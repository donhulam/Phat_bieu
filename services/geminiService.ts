import { GoogleGenAI, Part, Content } from "@google/genai";
import type { FormData } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const buildContentParts = (data: FormData, contextFileParts: Part[], keyPointsFileParts: Part[]): Part[] => {
  const parts: Part[] = [];

  parts.push({
    text: `
Bạn là một trợ lý viết văn chuyên nghiệp, chuyên viết các bài phát biểu cho lãnh đạo cấp cao. Dựa vào các thông tin sau, hãy soạn thảo một bài phát biểu tự nhiên, và có ý nghĩa bằng ngôn ngữ ${data.language || 'Tiếng Việt'}.

**Yêu cầu:**

1.  Bài phát biểu phải có cấu trúc rõ ràng gồm 3 phần, được phân tách chính xác bằng các tiêu đề sau: \`### **Mở đầu**\`, \`### **Thân bài**\`, và \`### **Kết luận**\`.
2.  Tuân thủ nghiêm ngặt **Phong cách phát biểu** đã được chọn. Lời văn phải phù hợp với phong cách '${data.style || 'Trang trọng'}', vai trò của người lãnh đạo và đối tượng khán giả.
3.  Tích hợp mượt mà các thông điệp và điểm nhấn đã cung cấp.
4.  Đảm bảo độ dài gần đúng với yêu cầu.
5.  Sử dụng định dạng Markdown (in đậm, gạch đầu dòng) để làm nổi bật các ý chính trong các phần.
6.  Phân tích kỹ lưỡng toàn bộ nội dung trong văn bản và các tệp đính kèm (bao gồm hình ảnh và tài liệu PDF) được cung cấp trong từng phần (Bối cảnh, Điểm nhấn). Trích xuất tất cả thông tin liên quan (ví dụ: dữ liệu từ biểu đồ, ý chính từ văn bản PDF, bối cảnh từ ảnh sự kiện) và kết hợp thông tin đó vào bài phát biểu một cách tự nhiên và chính xác.

Hãy bắt đầu viết bài phát biểu dựa trên các thông tin chi tiết dưới đây.
`
  });

  // Add all the form data as distinct text parts.
  parts.push({ text: `**Chức danh người phát biểu:** ${data.role || 'Không rõ'}` });
  parts.push({ text: `**Tên Hội nghi, Hội thảo, Sự kiện...:** ${data.eventName || 'Không rõ'}` });
  parts.push({ text: `**Đơn vị tổ chức (chủ trì) sự kiện:** ${data.organizer || 'Không rõ'}` });

  // Context section
  parts.push({ text: `**Căn cứ tổ chức sự kiện:**` });
  if (data.context) parts.push({ text: data.context });
  if (contextFileParts.length > 0) parts.push(...contextFileParts);
  if (!data.context && contextFileParts.length === 0) parts.push({ text: 'Không có' });


  parts.push({ text: `**Kết quả kỳ vọng sau sự kiện:** ${data.message || 'Không có'}` });
  parts.push({ text: `**Thành phần tham gia sự kiện:** ${data.audience || 'Không rõ'}` });

  // Key points section
  parts.push({ text: `**Các kết quả, số liệu nổi bật liên quan:**` });
  if (data.keyPoints) parts.push({ text: data.keyPoints });
  if (keyPointsFileParts.length > 0) parts.push(...keyPointsFileParts);
  if (!data.keyPoints && keyPointsFileParts.length === 0) parts.push({ text: 'Không có' });

  parts.push({ text: `**Phong cách phát biểu:** ${data.style || 'Trang trọng'}` });
  parts.push({ text: `**Độ dài yêu cầu (số từ):** ${data.length || 'Khoảng 300-500 từ'}` });
  parts.push({ text: `**Ngôn ngữ:** ${data.language || 'Tiếng Việt'}` });

  return parts;
};

export const generateSpeechStream = async (data: FormData, contextFileParts: Part[], keyPointsFileParts: Part[]) => {
  const parts = buildContentParts(data, contextFileParts, keyPointsFileParts);
  
  const contents = { parts };

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: contents,
    });
    return stream;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Không thể tạo nội dung. Vui lòng thử lại.");
  }
};

export const generateTitle = async (speechContent: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Dựa vào nội dung bài phát biểu sau, hãy tạo một tiêu đề tóm tắt ngắn gọn và súc tích (dưới 15 từ):\n\n---\n\n${speechContent}`,
    });
    // Clean up the title, remove quotes if any
    return response.text.trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error("Error generating title:", error);
    // Return a default title in case of an error
    return "Bài phát biểu chưa có tiêu đề";
  }
};

export const generateChatResponseStream = async (history: Content[], currentSpeech: string) => {
  if (!currentSpeech) {
    throw new Error("Cannot generate chat response without a speech context.");
  }

  const systemInstruction = `Bạn là một trợ lý AI chuyên nghiệp, chuyên chỉnh sửa và cải thiện các bài phát biểu. Người dùng đã tạo một bài phát biểu và bây giờ họ muốn bạn giúp tinh chỉnh nó.

**Nhiệm vụ của bạn:**
1.  Đọc kỹ yêu cầu của người dùng trong tin nhắn cuối cùng trong lịch sử hội thoại.
2.  Dựa trên yêu cầu đó, hãy chỉnh sửa **bài phát biểu hiện tại** được cung cấp dưới đây.
3.  **Luôn luôn** trả về **TOÀN BỘ BÀI PHÁT BIỂU ĐÃ ĐƯỢC CHỈNH SỬA** theo yêu cầu. Không đưa ra lời giải thích, bình luận, hay đoạn văn giới thiệu nào khác. Chỉ trả về nội dung bài phát biểu hoàn chỉnh.
4.  Giữ nguyên cấu trúc 3 phần (### **Mở đầu**, ### **Thân bài**, ### **Kết luận**) trừ khi người dùng yêu cầu thay đổi.

**Bài phát biểu hiện tại để bạn chỉnh sửa:**
---
${currentSpeech}
---
`;
  
  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: history,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return stream;
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw new Error("Không thể tạo phản hồi. Vui lòng thử lại.");
  }
};
