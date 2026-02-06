use tauri::image::Image;

fn main() {
    let bytes = include_bytes!("../icons/menu_show.png");
    let image = Image::from_bytes(bytes);
    // This line will fail to compile if image is not a Result/Option
    // let _ = image.expect("msg");
}
