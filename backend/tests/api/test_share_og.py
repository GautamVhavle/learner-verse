from app.api.v1.endpoints.share import _build_og_html


def test_share_html_escapes_markup_and_script_breakout():
    page = _build_og_html(
        title="</title><script>alert(1)</script>",
        description="a&b",
        image='https://cdn.example/a.png" onload="alert(1)',
        url='https://example.com/?q="><script>alert(1)</script>',
        redirect_url="https://learnerverse.example/courses/1",
        creator="Ada <img>",
        tags=["python", '"><script>alert(1)'],
        json_ld={"name": "</script><script>alert(1)</script>", "title": "Tom & Jerry"},
    )

    assert 'onload="alert' not in page
    assert "<script>alert(1)</script>" not in page
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in page
    assert "Ada &lt;img&gt;" in page

    body = page.split('type="application/ld+json">', 1)[1].split("</script>", 1)[0]
    assert "<" not in body
    assert "\\u003c/script\\u003e" in body
    assert "Tom \\u0026 Jerry" in body
