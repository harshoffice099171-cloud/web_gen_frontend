import google.generativeai as genai
from typing import List, Dict
import logging
import time
import json
import os
from config.settings import settings

logger = logging.getLogger(__name__)

class LLMProcessor:
    """Process extracted content using Gemini LLM"""
    
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
    def generate_presentation_script(self, content_data: Dict) -> List[Dict]:
        """
        Generate speaking scripts for each slide
        Args:
            content_data: Extracted content from presentation
        Returns: List of dicts with slide info and generated script
        """
        presentation_scripts = []
        scripts_dir = settings.SCRIPTS_DIR
        
        context_prompt = self._create_context_prompt(content_data)
        
        for slide in content_data['slides']:
            try:
                script = self._generate_slide_script(slide, context_prompt)
                
                script_data = {
                    'slide_number': slide['slide_number'],
                    'title': slide['title'],
                    'original_content': slide['content'],
                    'script': script,
                    'estimated_duration': self._estimate_duration(script),
                    'content_path': slide.get('content_path', '')
                }
                
                # Save script to JSON
                script_filename = f"slide_{slide['slide_number']:03d}.json"
                script_path = os.path.join(scripts_dir, script_filename)
                with open(script_path, 'w', encoding='utf-8') as f:
                    json.dump(script_data, f, indent=2)
                script_data['script_path'] = script_path
                
                presentation_scripts.append(script_data)
                
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"Error generating script for slide {slide['slide_number']}: {str(e)}")
                script_data = {
                    'slide_number': slide['slide_number'],
                    'title': slide['title'],
                    'original_content': slide['content'],
                    'script': slide['content'] or f"This is slide {slide['slide_number']}",
                    'estimated_duration': 5.0,
                    'content_path': slide.get('content_path', ''),
                    'script_path': ''
                }
                presentation_scripts.append(script_data)
        
        # Save all scripts
        scripts_path = os.path.join(scripts_dir, "all_scripts.json")
        with open(scripts_path, 'w', encoding='utf-8') as f:
            json.dump(presentation_scripts, f, indent=2)
        
        return presentation_scripts
    
    def _create_context_prompt(self, content_data: Dict) -> str:
        """Create context for the entire presentation"""
        return f"""
        Presentation Context:
        Title: {content_data['metadata']['title']}
        Author: {content_data['metadata']['author']}
        Total Slides: {content_data['total_slides']}
        
        You are helping to create a natural, engaging presentation script for text-to-speech conversion.
        The presentation should flow smoothly and sound conversational when read aloud by TTS.
        """
    
    def _generate_slide_script(self, slide: Dict, context: str) -> str:
        """Generate natural speaking script for a single slide"""
        prompt = f"""
        {context}
        
        Current Slide Information:
        Slide Number: {slide['slide_number']}
        Title: {slide['title']}
        Content: {slide['content']}
        Notes: {slide.get('notes', '')}
        
        CRITICAL INSTRUCTIONS for TTS-Ready Script:
        1. Generate ONLY speakable text - no stage directions, no formatting markers
        2. DO NOT include any bracketed instructions like {{pause}}, {{slow down}}, [emphasis], etc.
        3. DO NOT include any asterisks, dashes, or special formatting
        4. Write in complete, natural sentences that flow smoothly when read aloud
        5. Use proper punctuation (periods, commas) to create natural pauses
        6. The script should be 10-15 seconds (20-25 words) when spoken at normal pace
        7. Make it conversational and engaging, like a human presenter speaking naturally
        8. If this is slide 1, include a brief natural introduction
        9. If this appears to be a conclusion slide, provide a natural summary
        10. Expand on bullet points naturally without just reading them word-for-word
        
        Return ONLY the clean, speakable script text with no additional formatting or instructions:
        """
        
        try:
            response = self.model.generate_content(prompt)
            # Clean the response to remove any remaining formatting artifacts
            script = response.text.strip()
            script = self._clean_script_for_tts(script)
            return script
        except Exception as e:
            logger.error(f"Error with Gemini API: {str(e)}")
            return slide['content'] or f"This is slide {slide['slide_number']}"
    
    def _clean_script_for_tts(self, script: str) -> str:
        """Clean script to ensure it's TTS-ready"""
        # Remove common formatting artifacts that might slip through
        import re
        
        # Remove bracketed instructions
        script = re.sub(r'\{[^}]*\}', '', script)
        script = re.sub(r'\[[^\]]*\]', '', script)
        script = re.sub(r'\([^)]*pause[^)]*\)', '', script, flags=re.IGNORECASE)
        
        # Remove asterisks and other formatting
        script = re.sub(r'\*+', '', script)
        script = re.sub(r'#+', '', script)
        script = re.sub(r'_+', '', script)
        
        # Remove stage directions (common patterns)
        script = re.sub(r'(pause|slow down|emphasize|dramatic pause)', '', script, flags=re.IGNORECASE)
        
        # Clean up extra whitespace
        script = re.sub(r'\s+', ' ', script)
        script = script.strip()
        
        # Ensure proper sentence structure
        if script and not script.endswith(('.', '!', '?')):
            script += '.'
        
        return script
    
    def _estimate_duration(self, text: str) -> float:
        """Estimate speaking duration (roughly 150 words per minute)"""
        word_count = len(text.split())
        return max(2.0, (word_count / 150) * 60)  # Minimum 2 seconds