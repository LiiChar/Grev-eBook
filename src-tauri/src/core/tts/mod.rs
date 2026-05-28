use std::path::PathBuf;
use piper_rs::Piper;

pub fn generate_wav(text: &str, path: &PathBuf) {
  let config_path = PathBuf::from("E:/code/pet-project/Uni/src-tauri/resources/tts/ru/denis/ru_RU-denis-medium.onnx.json");
  let onnx_path = PathBuf::from("E:/code/pet-project/Uni/src-tauri/resources/tts/ru/denis/ru_RU-denis-medium.onnx");

  let piper = Piper::new(&model, &config).unwrap();
  let (samples, sample_rate) = piper.create(text.to_string(), false, 0, None, None, None).unwrap();

  let spec = hound::WavSpec {
      channels: 1,
      sample_rate,
      bits_per_sample: 16,
      sample_format: hound::SampleFormat::Int,
  };

  let mut writer = hound::WavWriter::create(path, spec).unwrap();
  for s in samples {
      writer.write_sample(s).unwrap();
  }
  writer.finalize().unwrap();
}


pub fn hash_text(text: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(text);
    format!("{:x}", hasher.finalize())
}

pub fn split_text(text: &str) -> Vec<String> {
    text
        .split(|c| c == '.' || c == '!' || c == '?')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}